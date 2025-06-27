
import { CompanyData, StoredCompany, BudgetItem } from '../types';
import { CSV_EXPORT_HEADERS } from '../constants';

const formatValue = (value: any): string => {
  if (value === null || typeof value === 'undefined') return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join('; ') || 'N/A';
  if (typeof value === 'object') return JSON.stringify(value); // For complex objects
  return String(value).replace(/"/g, '""'); // Escape double quotes
};

const getBudgetForYear = (budgetItems: BudgetItem[], year: string): { total: string, education: string } => {
    const budget = budgetItems.find(b => b.year === year);
    return {
        total: formatValue(budget?.totalBudget),
        education: formatValue(budget?.educationBudget)
    };
};

const companyDataToCSVRow = (company: CompanyData | StoredCompany): string[] => {
  const currentYear = new Date().getFullYear();
  const currentYearRange = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

  const budget2020 = getBudgetForYear(company.budgetInformation, "2020-21");
  const budget2021 = getBudgetForYear(company.budgetInformation, "2021-22");
  const budget2022 = getBudgetForYear(company.budgetInformation, "2022-23");
  const budget2023 = getBudgetForYear(company.budgetInformation, "2023-24");
  const budgetCurrent = getBudgetForYear(company.budgetInformation, currentYearRange);

  return [
    formatValue(company.nameOfCompany),
    formatValue(company.companyLinkedInURL),
    formatValue(company.cinNumber), // Renamed
    formatValue(company.csvCinNumber), // Renamed
    formatValue(company.segmentation),
    formatValue(company.priority),
    formatValue(company.spoc),
    formatValue(company.promoterLed),
    formatValue(company.nameOfPromoter),
    formatValue(company.industryType),
    formatValue(company.entityType),
    formatValue(company.officeLocation),
    formatValue(company.projectLocations),
    formatValue(company.domain),
    formatValue(company.dataRetrievalDate),
    formatValue(company.manuallyVerified), 
    budget2020.total, budget2020.education,
    budget2021.total, budget2021.education,
    budget2022.total, budget2022.education,
    budget2023.total, budget2023.education,
    budgetCurrent.total, budgetCurrent.education,
    formatValue(company.csrEducationFocus.doesEducation),
    formatValue(company.csrEducationFocus.educationSpend),
    formatValue(company.csrEducationFocus.isCorporateFoundation),
    formatValue(company.csrEducationFocus.currentNgoPartners),
    formatValue(company.csrEducationFocus.programType),
    formatValue(company.csrEducationFocus.csrAmountINRcr),
    formatValue(company.csrEducationFocus.csrCommitteeMembers),
    formatValue(company.keyContacts.primaryDecisionMaker),
    formatValue(company.keyContacts.secondaryDecisionMaker),
    formatValue(company.keyContacts.alternativeDecisionMaker),
    formatValue(company.pointsOfContact),
    formatValue(company.strategicOperationalInfo.proposedApproach),
    formatValue(company.strategicOperationalInfo.commentsStatus),
    formatValue(company.strategicOperationalInfo.weekOfOutreach),
    formatValue(company.strategicOperationalInfo.primaryLocationFinanceOrOffice),
    formatValue(company.strategicOperationalInfo.otherInfo),
    formatValue(company.strategicOperationalInfo.notesOverall),
    formatValue(company.sources)
  ];
};

export const exportCompaniesToCSV = (companies: (CompanyData | StoredCompany)[], filename: string): void => {
  if (companies.length === 0) {
    alert("No data to export.");
    return;
  }

  const csvRows: string[] = [];
  csvRows.push(CSV_EXPORT_HEADERS.map(header => `"${header}"`).join(',')); // Header row

  companies.forEach(company => {
    const row = companyDataToCSVRow(company);
    csvRows.push(row.map(value => `"${value}"`).join(','));
  });

  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};