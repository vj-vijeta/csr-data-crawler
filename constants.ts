
import { SearchMode } from './types';

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17';
export const API_RETRY_LIMIT = 3;
export const LOCAL_STORAGE_KEY = 'companyDataCrawlerApp';

const getCurrentYearRange = (): string => {
  const currentYear = new Date().getFullYear();
  return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
};

const getPromptBoilerplate = (companyName: string, searchMode: SearchMode): string => {
  const currentDate = new Date().toISOString().split('T')[0];
  const currentYearRange = getCurrentYearRange();

  let deepSearchInstructions = '';
  if (searchMode === SearchMode.DEEP) {
    deepSearchInstructions = `
For this deep search, please be particularly thorough. Cross-reference information from multiple sources to ensure accuracy. 
Look for nuanced details, such as the company's overall CSR reputation, the general tone of their public disclosures regarding social responsibility, 
and any significant positive or negative media mentions related to their CSR activities or educational initiatives. 
Synthesize these findings into the 'otherInfo' or 'notesOverall' fields if they don't fit elsewhere.
`;
  }

  return `
You are an AI assistant tasked with gathering public information about companies.
For the company "${companyName}", please find and provide the following information in a structured JSON format.
Ensure all URLs are fully qualified. If a piece of information is not found, use "N/A" for string fields, null for objects or boolean fields where appropriate, or an empty array for lists.
Prioritize information from official company websites, reputable financial news sources, and official registries.
Use Google Search to find this information.
${deepSearchInstructions}

The JSON structure MUST be as follows:

{
  "nameOfCompany": "string (The official name of the company: ${companyName})",
  "companyLinkedInURL": "string (full URL or N/A)",
  "cinNumber": "string (Corporate Identification Number - CIN, EIN, etc. or N/A)",
  "segmentation": "string (e.g., Large Cap, Mid Cap, SME or N/A)",
  "priority": "string (e.g., High, Medium, Low or N/A)",
  "spoc": "string (Single Point of Contact name if identifiable, else N/A)",
  "promoterLed": "boolean (true/false, or null if unknown)",
  "nameOfPromoter": "string (if promoterLed is true, else N/A)",
  "industryType": "string (e.g., Technology, Finance, Manufacturing or N/A)",
  "entityType": "string (Indian/Global or N/A)",
  "officeLocation": "string (Primary office address or N/A)",
  "projectLocations": ["string (list of key project locations or N/A if none)"],
  "domain": "string (Company's primary website domain or N/A)",
  "dataRetrievalDate": "${currentDate}",
  "budgetInformation": [
    { "year": "2020-21", "totalBudget": "string (amount with currency or N/A)", "educationBudget": "string (amount with currency or N/A)" },
    { "year": "2021-22", "totalBudget": "string (amount with currency or N/A)", "educationBudget": "string (amount with currency or N/A)" },
    { "year": "2022-23", "totalBudget": "string (amount with currency or N/A)", "educationBudget": "string (amount with currency or N/A)" },
    { "year": "2023-24", "totalBudget": "string (amount with currency or N/A)", "educationBudget": "string (amount with currency or N/A)" },
    { "year": "${currentYearRange}", "totalBudget": "string (amount with currency or N/A)", "educationBudget": "string (amount with currency or N/A)" }
  ],
  "csrEducationFocus": {
    "doesEducation": "boolean (true/false if they focus on education, or null if unknown)",
    "educationSpend": "string (amount or % of budget, or N/A)",
    "isCorporateFoundation": "boolean (true/false if they have a foundation, or null if unknown)",
    "currentNgoPartners": ["string (list of NGO partner names or N/A if none)"],
    "programType": ["string (e.g., Education, Health, Environment or N/A if none)"],
    "csrAmountINRcr": "string (total CSR amount in INR Crores, or N/A)",
    "csrCommitteeMembers": [
      { "name": "string (or N/A)", "designation": "string (or N/A)", "contactInfo": "string (email/phone if public, else N/A)", "linkedInProfileUrl": "string (URL or N/A)" }
    ]
  },
  "keyContacts": {
    "primaryDecisionMaker": { "name": "string (or N/A)", "designation": "string (or N/A)", "email": "string (if public, else N/A)", "phone": "string (if public, else N/A)", "notes": "string (or N/A)" },
    "secondaryDecisionMaker": { "name": "string (or N/A)", "designation": "string (or N/A)", "email": "string (if public, else N/A)", "phone": "string (if public, else N/A)", "notes": "string (or N/A)" },
    "alternativeDecisionMaker": { "name": "string (or N/A)", "designation": "string (or N/A)", "email": "string (if public, else N/A)", "phone": "string (if public, else N/A)", "notes": "string (or N/A)" }
  },
  "pointsOfContact": [
    { "pocNumber": 1, "name": "string (or N/A)", "designation": "string (or N/A)", "email": "string (if public, else N/A)", "phone": "string (if public, else N/A)", "notes": "string (or N/A)" },
    { "pocNumber": 2, "name": "string (or N/A)", "designation": "string (or N/A)", "email": "string (if public, else N/A)", "phone": "string (if public, else N/A)", "notes": "string (or N/A)" },
    { "pocNumber": 3, "name": "string (or N/A)", "designation": "string (or N/A)", "email": "string (if public, else N/A)", "phone": "string (if public, else N/A)", "notes": "string (or N/A)" }
  ],
  "strategicOperationalInfo": {
    "proposedApproach": "string (brief summary or N/A)",
    "commentsStatus": "string (e.g., Initial Research, Contacted, Follow-up Needed or N/A)",
    "weekOfOutreach": "string (e.g., YYYY-WW or N/A)",
    "primaryLocationFinanceOrOffice": "string (City/Region or N/A)",
    "otherInfo": "string (any other relevant public info or N/A)",
    "notesOverall": "string (general notes or N/A)"
  }
}

Respond ONLY with the JSON object. Do not add any explanatory text before or after the JSON.
The company name is "${companyName}". Ensure "nameOfCompany" in the JSON is exactly this.
`;
};

export const getStandardSearchPrompt = (companyName: string): string => getPromptBoilerplate(companyName, SearchMode.STANDARD);
export const getDeepSearchPrompt = (companyName: string): string => getPromptBoilerplate(companyName, SearchMode.DEEP);

export const CSV_EXPORT_HEADERS = [
    "Name of Company", "LinkedIn URL", "CIN No.", "CSV CIN No.", "Segmentation", "Priority", "SPOC", "Promoter Led", "Name of Promoter",
    "Industry Type", "Entity Type", "Office Location", "Project Locations", "Domain", "Data Retrieval Date", "Manually Verified",
    "Budget 2020-21 Total", "Budget 2020-21 Education",
    "Budget 2021-22 Total", "Budget 2021-22 Education",
    "Budget 2022-23 Total", "Budget 2022-23 Education",
    "Budget 2023-24 Total", "Budget 2023-24 Education",
    `Budget ${getCurrentYearRange()} Total`, `Budget ${getCurrentYearRange()} Education`,
    "Does Education Focus", "Education Spend", "Is Corporate Foundation", "Current NGO Partners", "Program Type", "CSR Amount (INR cr)",
    "CSR Committee Members (JSON)",
    "Primary Decision Maker (JSON)", "Secondary Decision Maker (JSON)", "Alternative Decision Maker (JSON)",
    "POCs (JSON)",
    "Proposed Approach", "Comments/Status", "Week of Outreach", "Primary Location Finance/Office", "Other Info", "Notes Overall",
    "Sources (JSON)"
];

export const CSV_IMPORT_EXPECTED_HEADERS = {
  NAME: "Names of Organisation",
  CIN: "CIN" // This refers to the column header in the imported CSV.
};


export const TAB_OPTIONS = ["General Info", "CSR & Education", "Budget", "Contacts", "Strategic", "Sources"];