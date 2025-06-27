
export enum SearchMode {
  STANDARD = 'STANDARD',
  DEEP = 'DEEP',
}

// Re-exporting these from @google/genai for convenience if needed in multiple places
// or to avoid direct imports of @google/genai in all components that might need them.
// However, it's often cleaner to import them where used.
// For now, keeping them here as they are part of the broader type definitions for the app.
export type { GoogleGenAI, GenerateContentResponse, GroundingChunk } from "@google/genai";


export interface BudgetItem {
  year: string;
  totalBudget: string | null;
  educationBudget: string | null;
}

export interface CSRCommitteeMember {
  name: string | null;
  designation: string | null;
  contactInfo: string | null;
  linkedInProfileUrl: string | null;
}

export interface ContactPerson {
  name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface POC extends ContactPerson {
  pocNumber?: number;
}

export interface Source {
  uri: string;
  title: string;
}

export interface CompanyData {
  nameOfCompany: string;
  companyLinkedInURL: string | null;
  cinNumber: string | null; 
  csvCinNumber: string | null; 
  segmentation: string | null;
  priority: string | null;
  spoc: string | null;
  promoterLed: boolean | null;
  nameOfPromoter: string | null;
  industryType: string | null;
  entityType: string | null; 
  officeLocation: string | null;
  projectLocations: string[] | null;
  domain: string | null;
  dataRetrievalDate: string; 

  budgetInformation: BudgetItem[];

  csrEducationFocus: {
    doesEducation: boolean | null;
    educationSpend: string | null; 
    isCorporateFoundation: boolean | null;
    currentNgoPartners: string[] | null;
    programType: string[] | null; 
    csrAmountINRcr: string | null;
    csrCommitteeMembers: CSRCommitteeMember[] | null;
  };

  keyContacts: {
    primaryDecisionMaker: ContactPerson | null;
    secondaryDecisionMaker: ContactPerson | null;
    alternativeDecisionMaker: ContactPerson | null;
  };

  pointsOfContact: POC[] | null;

  strategicOperationalInfo: {
    proposedApproach: string | null;
    commentsStatus: string | null;
    weekOfOutreach: string | null;
    primaryLocationFinanceOrOffice: string | null;
    otherInfo: string | null;
    notesOverall: string | null;
  };
  
  sources: Source[] | null;
  manuallyVerified: boolean;
}

export interface StoredCompany extends CompanyData {
  id: string; 
  lastFetched: string; 
}

export interface StructuredNewsContent {
  news: string | null;
  events: string | null;
  awards: string | null;
  educationCsr: string | null; // Added new field for education-specific CSR
}