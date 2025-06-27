
import { StoredCompany } from '../types';
import { LOCAL_STORAGE_KEY } from '../constants';

export const saveCompanyToStorage = (companyData: StoredCompany): void => {
  const companies = getAllCompaniesFromStorage();
  const existingIndex = companies.findIndex(c => c.id === companyData.id);
  if (existingIndex > -1) {
    companies[existingIndex] = companyData;
  } else {
    companies.push(companyData);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(companies));
};

export const getCompanyFromStorage = (companyId: string): StoredCompany | undefined => {
  const companies = getAllCompaniesFromStorage();
  return companies.find(c => c.id === companyId);
};

export const getAllCompaniesFromStorage = (): StoredCompany[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteCompanyFromStorage = (companyId: string): void => {
  let companies = getAllCompaniesFromStorage();
  companies = companies.filter(c => c.id !== companyId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(companies));
};

export const deleteAllCompaniesFromStorage = (): void => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

export const companyToId = (companyName: string): string => {
  return companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
};
    