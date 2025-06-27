
import { GoogleGenAI, GenerateContentResponse, GroundingChunk } from "@google/genai";
import { CompanyData, SearchMode, Source } from '../types';
import { GEMINI_MODEL_TEXT, getStandardSearchPrompt, getDeepSearchPrompt } from '../constants';

// API_KEY and ai instance are now managed in App.tsx and passed to functions needing them.

const parseGeminiResponse = (responseText: string, companyName: string): Partial<CompanyData> => {
  let jsonStr = responseText.trim();
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[1]) {
    jsonStr = match[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed as Partial<CompanyData>;
  } catch (error) {
    console.error("Failed to parse JSON response from Gemini:", error);
    console.error("Problematic JSON string:", jsonStr);
    throw new Error(`Failed to parse AI response. Raw response: ${jsonStr.substring(0, 500)}...`);
  }
};

const mapGroundingChunksToSources = (chunks?: GroundingChunk[]): Source[] | null => {
  if (!chunks || chunks.length === 0) return null;
  return chunks
    .filter(chunk => chunk.web && chunk.web.uri)
    .map(chunk => ({
      uri: chunk.web!.uri!,
      title: chunk.web!.title || 'N/A',
    }));
};

export const createEmptyCompanyData = (companyName: string): CompanyData => {
  const currentDate = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentYearRange = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
  
  return {
    nameOfCompany: companyName,
    companyLinkedInURL: null, 
    cinNumber: null,
    csvCinNumber: null,
    segmentation: null,
    priority: null,
    spoc: null,
    promoterLed: null,
    nameOfPromoter: null,
    industryType: null,
    entityType: null,
    officeLocation: null,
    projectLocations: [],
    domain: null,
    dataRetrievalDate: currentDate,
    budgetInformation: [
      { year: "2020-21", totalBudget: null, educationBudget: null },
      { year: "2021-22", totalBudget: null, educationBudget: null },
      { year: "2022-23", totalBudget: null, educationBudget: null },
      { year: "2023-24", totalBudget: null, educationBudget: null },
      { year: currentYearRange, totalBudget: null, educationBudget: null },
    ],
    csrEducationFocus: {
      doesEducation: null,
      educationSpend: null,
      isCorporateFoundation: null,
      currentNgoPartners: [],
      programType: [],
      csrAmountINRcr: null,
      csrCommitteeMembers: [],
    },
    keyContacts: {
      primaryDecisionMaker: {name: null, designation: null, email: null, phone: null, notes: null},
      secondaryDecisionMaker: {name: null, designation: null, email: null, phone: null, notes: null},
      alternativeDecisionMaker: {name: null, designation: null, email: null, phone: null, notes: null},
    },
    pointsOfContact: [],
    strategicOperationalInfo: {
      proposedApproach: null,
      commentsStatus: null,
      weekOfOutreach: null,
      primaryLocationFinanceOrOffice: null,
      otherInfo: null,
      notesOverall: null,
    },
    sources: [],
    manuallyVerified: false, 
  };
};


export const fetchCompanyDataFromGemini = async (
  aiInstance: GoogleGenAI, // Accept ai instance
  companyName: string,
  searchMode: SearchMode
): Promise<CompanyData> => {
  // API_KEY check is implicitly handled by aiInstance being non-null if API_KEY was set
  if (!aiInstance) {
     console.warn("Gemini AI instance not provided. Returning empty data structure.");
     const emptyData = createEmptyCompanyData(companyName);
     emptyData.strategicOperationalInfo.notesOverall = "Error: Gemini AI instance not available. Could not fetch live data.";
     return emptyData;
  }

  const prompt = searchMode === SearchMode.STANDARD
    ? getStandardSearchPrompt(companyName)
    : getDeepSearchPrompt(companyName);

  try {
    const response: GenerateContentResponse = await aiInstance.models.generateContent({ // Use passed aiInstance
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = response.text;
    if (!rawText) {
      const emptyDataOnError = createEmptyCompanyData(companyName);
      emptyDataOnError.strategicOperationalInfo.notesOverall = "Received empty response from AI. No data retrieved.";
      return emptyDataOnError;
    }
    
    const parsedData = parseGeminiResponse(rawText, companyName);
    const sources = mapGroundingChunksToSources(response.candidates?.[0]?.groundingMetadata?.groundingChunks);
    const baseEmptyData = createEmptyCompanyData(companyName);
    
    const mergedData: CompanyData = {
      ...baseEmptyData,
      ...parsedData, 
      nameOfCompany: companyName, 
      dataRetrievalDate: parsedData.dataRetrievalDate || baseEmptyData.dataRetrievalDate,
      sources: sources || baseEmptyData.sources,
      csrEducationFocus: {
        ...baseEmptyData.csrEducationFocus,
        ...(parsedData.csrEducationFocus || {}),
        currentNgoPartners: parsedData.csrEducationFocus?.currentNgoPartners || baseEmptyData.csrEducationFocus.currentNgoPartners,
        programType: parsedData.csrEducationFocus?.programType || baseEmptyData.csrEducationFocus.programType,
        csrCommitteeMembers: parsedData.csrEducationFocus?.csrCommitteeMembers || baseEmptyData.csrEducationFocus.csrCommitteeMembers,
      },
      keyContacts: { 
        primaryDecisionMaker: {...baseEmptyData.keyContacts.primaryDecisionMaker, ...(parsedData.keyContacts?.primaryDecisionMaker || {})},
        secondaryDecisionMaker: {...baseEmptyData.keyContacts.secondaryDecisionMaker, ...(parsedData.keyContacts?.secondaryDecisionMaker || {})},
        alternativeDecisionMaker: {...baseEmptyData.keyContacts.alternativeDecisionMaker, ...(parsedData.keyContacts?.alternativeDecisionMaker || {})},
      },
      strategicOperationalInfo: {
        ...baseEmptyData.strategicOperationalInfo,
        ...(parsedData.strategicOperationalInfo || {}),
      },
      budgetInformation: parsedData.budgetInformation && parsedData.budgetInformation.length > 0 ? parsedData.budgetInformation : baseEmptyData.budgetInformation,
      projectLocations: parsedData.projectLocations || baseEmptyData.projectLocations,
      pointsOfContact: parsedData.pointsOfContact || baseEmptyData.pointsOfContact,
    };
    
    return mergedData;

  } catch (error) {
    console.error(`Error fetching data for ${companyName}:`, error);
    const errorData = createEmptyCompanyData(companyName);
    errorData.strategicOperationalInfo.notesOverall = error instanceof Error ? `AI API Error: ${error.message}` : "An unknown error occurred during AI fetch.";
    return errorData;
  }
};
