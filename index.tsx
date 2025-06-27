
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, GenerateContentResponse, GroundingChunk } from "@google/genai";
import { StoredCompany, SearchMode, CompanyData, Source, StructuredNewsContent } from './types'; // Added StructuredNewsContent
import { GEMINI_MODEL_TEXT, CSV_IMPORT_EXPECTED_HEADERS } from './constants'; // Removed TAB_OPTIONS from here
import { 
  saveCompanyToStorage, 
  getAllCompaniesFromStorage, 
  deleteCompanyFromStorage, 
  deleteAllCompaniesFromStorage,
  companyToId 
} from './services/localStorageService';
import { exportCompaniesToCSV } from './services/csvExportService';
import { fetchCompanyDataFromGemini, createEmptyCompanyData } from './services/geminiService';
import SearchInput from './components/SearchInput';
import CompanyCard from './components/CompanyCard';
import LoadingSpinner from './components/LoadingSpinner';
import NewsModal from './components/NewsModal';
import { DownloadIcon, TrashIcon, SunIcon, MoonIcon, ImportCsvIcon, NewsIcon } from './components/icons';
import IconButton from './components/IconButton';

let ai: GoogleGenAI | null = null;
const apiKey = process.env.API_KEY;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey: apiKey });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI. Make sure API_KEY is set in your environment.", e);
  }
} else {
    console.warn("API_KEY environment variable not set. Gemini API calls will be disabled.");
}

type GroupingCriteria = 'segmentation' | 'industryType';


const App: React.FC = () => {
  const [storedCompanies, setStoredCompanies] = useState<StoredCompany[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentBatchProgress, setCurrentBatchProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [refreshingCompanyId, setRefreshingCompanyId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lastSearchedCompanyNames, setLastSearchedCompanyNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filtering and Grouping State
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [groupingCriteria, setGroupingCriteria] = useState<GroupingCriteria>('segmentation');
  const [activeGroupKey, setActiveGroupKey] = useState<string>('All');

  // News Modal State
  const [isNewsModalOpen, setIsNewsModalOpen] = useState<boolean>(false);
  const [newsContent, setNewsContent] = useState<StructuredNewsContent | null>(null);
  const [newsSources, setNewsSources] = useState<Source[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(false);
  const [generalNewsLastFetched, setGeneralNewsLastFetched] = useState<string | null>(null);


  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
        setIsDarkMode(storedTheme === 'dark');
    } else {
        setIsDarkMode(prefersDark); 
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      document.body.classList.add('bg-neutral-900', 'text-neutral-200');
      document.body.classList.remove('bg-neutral-50', 'text-neutral-800');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      document.body.classList.add('bg-neutral-50', 'text-neutral-800');
      document.body.classList.remove('bg-neutral-900', 'text-neutral-200');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);


  useEffect(() => {
    setStoredCompanies(getAllCompaniesFromStorage());
  }, []);

  const processCompanyFetch = async (
    companyName: string, 
    mode: SearchMode, 
    csvCinValue: string | null = null,
    existingCompanyData?: StoredCompany 
  ): Promise<StoredCompany> => {
    if (!ai) {
      throw new Error("Gemini API not initialized. API_KEY might be missing.");
    }

    const geminiData = await fetchCompanyDataFromGemini(ai, companyName, mode); // Pass ai instance
    
    const finalCinNumber = (geminiData.cinNumber && geminiData.cinNumber !== "N/A") 
      ? geminiData.cinNumber 
      : (existingCompanyData?.cinNumber && existingCompanyData.cinNumber !== "N/A" 
          ? existingCompanyData.cinNumber
          : (csvCinValue || "N/A"));

    const finalCsvCinNumber = csvCinValue !== null ? csvCinValue : (existingCompanyData?.csvCinNumber || null);

    const newCompanyData: StoredCompany = {
      ...(existingCompanyData || createEmptyCompanyData(companyName)), 
      ...geminiData, 
      nameOfCompany: companyName, 
      cinNumber: finalCinNumber,
      csvCinNumber: finalCsvCinNumber,
      manuallyVerified: existingCompanyData?.manuallyVerified || false, 
      id: companyToId(companyName),
      lastFetched: new Date().toISOString(),
      sources: geminiData.sources && geminiData.sources.length > 0 ? geminiData.sources : (existingCompanyData?.sources || []),
      segmentation: geminiData.segmentation || existingCompanyData?.segmentation || null,
      industryType: geminiData.industryType || existingCompanyData?.industryType || null,
    };
    return newCompanyData;
  };


  const handleSearch = useCallback(async (companyNames: string[], mode: SearchMode) => {
    if (!ai) {
      setError("Gemini API not initialized. Ensure API_KEY is set and refresh.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setLastSearchedCompanyNames(companyNames.length === 1 ? [companyNames[0]] : []); 
    setCurrentBatchProgress(`Starting search for ${companyNames.length} company${companyNames.length > 1 ? 'ies' : ''}...`);
    
    let companiesProcessed = 0;
    let newCompaniesFetchedCount = 0;
    const currentStoredCompanies = getAllCompaniesFromStorage(); 
    const updatedCompanyList = [...currentStoredCompanies];

    for (const name of companyNames) {
      companiesProcessed++;
      const companyId = companyToId(name);
      setCurrentBatchProgress(`Fetching data for "${name}" (${companiesProcessed}/${companyNames.length})...`);
      
      const existingCompanyIndex = updatedCompanyList.findIndex(c => c.id === companyId);
      let existingCompany: StoredCompany | undefined = undefined;
      if (existingCompanyIndex !== -1) {
          existingCompany = updatedCompanyList[existingCompanyIndex];
          const overwrite = window.confirm(`Data for "${name}" already exists (last fetched: ${new Date(existingCompany.lastFetched).toLocaleDateString()}). Overwrite with new data from AI? (Manual edits, verification status, and CSV CIN No. will be preserved if not overwritten by AI)`);
          if (!overwrite) {
            setCurrentBatchProgress(`Skipped "${name}", existing data retained. (${companiesProcessed}/${companyNames.length})`);
            continue;
          }
      }

      try {
        const storedCompany = await processCompanyFetch(name, mode, null, existingCompany); 
        if (storedCompany) {
            saveCompanyToStorage(storedCompany); 
            if (existingCompanyIndex !== -1) {
                updatedCompanyList[existingCompanyIndex] = storedCompany;
            } else {
                updatedCompanyList.push(storedCompany);
            }
            newCompaniesFetchedCount++;
        }
      } catch (err) {
        console.error(`Failed to fetch data for ${name}: `, err);
        setError((prevError) => `${prevError ? prevError + '\\n' : ''}Failed for ${name}: ${(err as Error).message}`);
      }
    }
    
    setStoredCompanies(getAllCompaniesFromStorage()); 
    setIsLoading(false);
    setCurrentBatchProgress('');
    if(!error && newCompaniesFetchedCount > 0) {
        alert(`Successfully fetched/updated data for ${newCompaniesFetchedCount} company${newCompaniesFetchedCount > 1 ? 'ies' : ''}.`);
    } else if (!error && companyNames.length > 0 && newCompaniesFetchedCount === 0) {
        alert("No new company data was fetched. Companies might have been skipped or issues occurred with all requests.");
    }
  }, [error]); 

  const handleRefreshCompany = useCallback(async (companyId: string, searchMode: SearchMode = SearchMode.STANDARD) => {
    if (!ai) {
      setError("Gemini API not initialized. Ensure API_KEY is set and refresh.");
      return;
    }
    const currentCompanies = getAllCompaniesFromStorage();
    const companyToRefresh = currentCompanies.find(c => c.id === companyId);
    if (!companyToRefresh) return;

    setRefreshingCompanyId(companyId);
    setError(null);
    try {
      const updatedCompany = await processCompanyFetch(companyToRefresh.nameOfCompany, searchMode, companyToRefresh.csvCinNumber, companyToRefresh);
      if (updatedCompany) {
        saveCompanyToStorage(updatedCompany);
        setStoredCompanies(prev => prev.map(c => c.id === companyId ? updatedCompany : c));
        alert(`Data for ${updatedCompany.nameOfCompany} refreshed successfully.`);
      }
    } catch (err) {
      console.error(`Failed to refresh data for ${companyToRefresh.nameOfCompany}: `, err);
      setError(`Failed to refresh ${companyToRefresh.nameOfCompany}: ${(err as Error).message}`);
    } finally {
      setRefreshingCompanyId(null);
    }
  }, []); 

  const handleDeleteCompany = (companyId: string) => {
    const company = storedCompanies.find(c => c.id === companyId);
    if (company && window.confirm(`Are you sure you want to delete data for "${company.nameOfCompany}"?`)) {
      deleteCompanyFromStorage(companyId);
      setStoredCompanies(prev => prev.filter(c => c.id !== companyId));
    }
  };

  const handleDeleteAllCompanies = () => {
    if (storedCompanies.length === 0) {
        alert("No data to delete.");
        return;
    }
    if (window.confirm("Are you sure you want to delete ALL stored company data? This cannot be undone.")) {
      deleteAllCompaniesFromStorage();
      setStoredCompanies([]);
      alert("All company data has been deleted.");
    }
  };

  const handleExportCompany = (companyId: string) => {
    const companyToExport = storedCompanies.find(c => c.id === companyId);
    if (companyToExport) {
      exportCompaniesToCSV([companyToExport], `${companyToId(companyToExport.nameOfCompany)}_data.csv`);
    }
  };

  const handleExportAllCompanies = () => {
    if (storedCompanies.length === 0) {
      alert("No company data to export.");
      return;
    }
    exportCompaniesToCSV(storedCompanies, 'all_companies_data.csv');
  };

  const handleToggleVerification = (companyId: string) => {
    const currentCompanies = getAllCompaniesFromStorage();
    const companyIndex = currentCompanies.findIndex(c => c.id === companyId);
    if (companyIndex !== -1) {
      const company = currentCompanies[companyIndex];
      const updatedCompany = { ...company, manuallyVerified: !company.manuallyVerified, lastFetched: new Date().toISOString() };
      saveCompanyToStorage(updatedCompany);
      setStoredCompanies(prev => prev.map(c => c.id === companyId ? updatedCompany : c));
    }
  };
  
  const handleSaveEdits = (companyId: string, editedData: CompanyData) => {
    const currentCompanies = getAllCompaniesFromStorage();
    const companyIndex = currentCompanies.findIndex(c => c.id === companyId);
    if (companyIndex !== -1) {
      const originalCompany = currentCompanies[companyIndex];
      const updatedCompany: StoredCompany = {
        ...originalCompany, 
        ...editedData,     
        id: companyId,     
        lastFetched: new Date().toISOString(), 
      };
      saveCompanyToStorage(updatedCompany);
      setStoredCompanies(prev => prev.map(c => c.id === companyId ? updatedCompany : c));
      alert(`Changes for ${updatedCompany.nameOfCompany} saved successfully.`);
    } else {
      console.error("Company not found for saving edits:", companyId);
      setError("Error: Could not find company to save. Please refresh.");
    }
  };


  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ai) {
      setError("Gemini API not initialized. Ensure API_KEY is set and refresh.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentBatchProgress('Processing CSV file...');
    setLastSearchedCompanyNames([]); 

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const lines = content.split(/\r\n|\n/).filter(line => line.trim() !== '');

      if (lines.length < 1) { 
        setError("CSV file is empty or has no header/data rows.");
        setIsLoading(false);
        return;
      }
      
      const headerLine = lines[0].trim();
      const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      const nameIndex = headers.indexOf(CSV_IMPORT_EXPECTED_HEADERS.NAME);
      const cinIndex = headers.indexOf(CSV_IMPORT_EXPECTED_HEADERS.CIN); 

      if (nameIndex === -1) {
        setError(`CSV header "${CSV_IMPORT_EXPECTED_HEADERS.NAME}" not found.`);
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (cinIndex === -1) {
         console.warn(`CSV header "${CSV_IMPORT_EXPECTED_HEADERS.CIN}" not found. CIN numbers will not be imported for the 'CSV CIN No.' field unless already present or found by AI for the main 'CIN No.' field.`);
      }

      const companiesFromCsv: { name: string; cinFromFile: string | null }[] = [];
      const dataLines = lines.length === 1 && nameIndex !== -1 ? [lines[0]] : lines.slice(1);

      for (const line of dataLines) {
        if (!line.trim()) continue;
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const name = values[nameIndex];
        const cinFromFile = cinIndex !== -1 ? (values[cinIndex] || null) : null;
        if (name) {
          companiesFromCsv.push({ name, cinFromFile });
        }
      }

      if (companiesFromCsv.length === 0) {
        setError("No valid company entries found in CSV after header.");
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      if (companiesFromCsv.length === 1) {
        setLastSearchedCompanyNames([companiesFromCsv[0].name]);
      }
      setCurrentBatchProgress(`Starting import for ${companiesFromCsv.length} company${companiesFromCsv.length > 1 ? 'ies' : ''} from CSV...`);

      let companiesProcessed = 0;
      let newCompaniesFetchedCount = 0;
      const currentStoredCompanies = getAllCompaniesFromStorage();
      const updatedCompanyList = [...currentStoredCompanies];

      for (const { name, cinFromFile } of companiesFromCsv) {
        companiesProcessed++;
        const companyId = companyToId(name);
        setCurrentBatchProgress(`Importing "${name}" (${companiesProcessed}/${companiesFromCsv.length})...`);

        const existingCompanyIndex = updatedCompanyList.findIndex(c => c.id === companyId);
        let existingCompany : StoredCompany | undefined = undefined;

        if (existingCompanyIndex !== -1) {
            existingCompany = updatedCompanyList[existingCompanyIndex];
            const overwrite = window.confirm(`Data for "${name}" already exists (last fetched: ${new Date(existingCompany.lastFetched).toLocaleDateString()}). Overwrite with new data from AI and use CIN from CSV for 'CSV CIN No.' field? (Manual edits and verification status will be preserved unless directly overwritten by AI fields)`);
            if (!overwrite) {
              setCurrentBatchProgress(`Skipped "${name}", existing data retained. (${companiesProcessed}/${companiesFromCsv.length})`);
              continue;
            }
        }
        
        try {
          const storedCompany = await processCompanyFetch(name, SearchMode.STANDARD, cinFromFile, existingCompany);
           if (storedCompany) {
            saveCompanyToStorage(storedCompany);
            if (existingCompanyIndex !== -1) {
                updatedCompanyList[existingCompanyIndex] = storedCompany;
            } else {
                updatedCompanyList.push(storedCompany);
            }
            newCompaniesFetchedCount++;
           }
        } catch (err) {
          console.error(`Failed to fetch/process data for ${name} from CSV: `, err);
          setError((prevError) => `${prevError ? prevError + '\\n' : ''}Failed for ${name} (CSV): ${(err as Error).message}`);
        }
      }
      
      setStoredCompanies(getAllCompaniesFromStorage());
      setIsLoading(false);
      setCurrentBatchProgress('');
      if (!error && newCompaniesFetchedCount > 0) {
        alert(`Successfully imported/updated data for ${newCompaniesFetchedCount} company${newCompaniesFetchedCount > 1 ? 'ies' : ''} from CSV.`);
      } else if (!error && companiesFromCsv.length > 0 && newCompaniesFetchedCount === 0) {
        alert("No new company data was imported/updated from CSV. Companies may have been skipped or issues occurred.");
      }
    };
    reader.onerror = () => {
      setError("Failed to read CSV file.");
      setIsLoading(false);
      setCurrentBatchProgress('');
    };
    reader.readAsText(file);
    if (fileInputRef.current) { 
        fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const parseStructuredNewsContent = (responseText: string): StructuredNewsContent => {
    const newsSectionHeader = "LATEST CSR NEWS:";
    const eventsSectionHeader = "UPCOMING CSR & EDUCATION EVENTS:";
    const awardsSectionHeader = "CSR & EDUCATION AWARDS:";
    const educationCsrSectionHeader = "SPECIFIC EDUCATION CSR INITIATIVES:"; // New section header
    const defaultText = "No specific information found at this time.";

    let news = null;
    let events = null;
    let awards = null;
    let educationCsr = null; // Variable for new section

    const newsIndex = responseText.indexOf(newsSectionHeader);
    const eventsIndex = responseText.indexOf(eventsSectionHeader);
    const awardsIndex = responseText.indexOf(awardsSectionHeader);
    const educationCsrIndex = responseText.indexOf(educationCsrSectionHeader); // Index for new section

    // Determine end points for each section carefully
    const sectionIndices = [
        {name: 'news', index: newsIndex, header: newsSectionHeader},
        {name: 'events', index: eventsIndex, header: eventsSectionHeader},
        {name: 'awards', index: awardsIndex, header: awardsSectionHeader},
        {name: 'educationCsr', index: educationCsrIndex, header: educationCsrSectionHeader}
    ].filter(s => s.index !== -1).sort((a,b) => a.index - b.index);

    for (let i = 0; i < sectionIndices.length; i++) {
        const currentSection = sectionIndices[i];
        const nextSection = sectionIndices[i+1];
        const endIndex = nextSection ? nextSection.index : responseText.length;
        const content = responseText.substring(currentSection.index + currentSection.header.length, endIndex).trim() || defaultText;
        
        if (currentSection.name === 'news') news = content;
        else if (currentSection.name === 'events') events = content;
        else if (currentSection.name === 'awards') awards = content;
        else if (currentSection.name === 'educationCsr') educationCsr = content;
    }
    
    return {
      news: news || (newsIndex === -1 ? defaultText : null),
      events: events || (eventsIndex === -1 ? defaultText : null),
      awards: awards || (awardsIndex === -1 ? defaultText : null),
      educationCsr: educationCsr || (educationCsrIndex === -1 ? defaultText : null), // Assign parsed content or default
    };
  };

  const handleFetchNewsOrEvents = async () => {
    if (!ai) {
      setError("Gemini API not initialized. Cannot fetch news.");
      return;
    }
    setIsLoadingNews(true);
    setNewsSources([]);
    setError(null);

    const newsPrompt = `
Please provide information clearly separated into the following sections: 'LATEST CSR NEWS:', 'UPCOMING CSR & EDUCATION EVENTS:', 'CSR & EDUCATION AWARDS:', and 'SPECIFIC EDUCATION CSR INITIATIVES:'.

For 'LATEST CSR NEWS:':
- Include recent (last 3-6 months) news articles related to Corporate Social Responsibility (CSR) initiatives, trends, and funding globally and in India.
- For each item, provide a title and a brief summary.

For 'UPCOMING CSR & EDUCATION EVENTS:':
- List upcoming conferences, workshops, webinars, or funding deadlines related to CSR and education.
- For each event, include: its name, date(s), location (or 'Online' if virtual), a brief description of its focus, and if publicly available, a direct URL for registration or more information. Ensure URLs are fully qualified.

For 'CSR & EDUCATION AWARDS:':
- List notable awards recognizing CSR and education initiatives.
- For each award, include: the award name, a brief description of its purpose/focus, the organizing body, and if publicly available, a URL for nominations or further details. Ensure URLs are fully qualified.

For 'SPECIFIC EDUCATION CSR INITIATIVES:':
- Detail recent news, upcoming events (including registration links), and awards specifically related to corporate social responsibility in the education sector.
- This should focus on initiatives like school support, scholarships, vocational training, and digital literacy programs funded or run by corporations.
- For events and awards in this education-specific section, include similar details as requested in the general events and awards sections (name, date, location, description, URLs). Ensure URLs are fully qualified.

Use Google Search to find this information. 
If no information is found for a subsection, please state 'No specific information found at this time.' under that section's heading.
Structure the entire response as plain text with these clear section headings as the primary separators.
`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_TEXT,
        contents: newsPrompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      
      if (response.text) {
        setNewsContent(parseStructuredNewsContent(response.text));
        setGeneralNewsLastFetched(new Date().toISOString());
      } else {
        setNewsContent({
            news: "No news content received.",
            events: "No events content received.",
            awards: "No awards content received.",
            educationCsr: "No education CSR content received." // Default for new field
        });
      }
      
      const sources: Source[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((chunk: GroundingChunk) => chunk.web && chunk.web.uri)
        .map((chunk: GroundingChunk) => ({
          uri: chunk.web!.uri!,
          title: chunk.web!.title || chunk.web!.uri!, 
        })) || [];
      setNewsSources(sources);
      
    } catch (err) {
      console.error("Error fetching CSR news/events:", err);
      setError(`Failed to fetch CSR news: ${(err as Error).message}`);
      setNewsContent({
          news: "Could not load news at this time due to an error.",
          events: "Could not load events at this time due to an error.",
          awards: "Could not load awards at this time due to an error.",
          educationCsr: "Could not load education CSR information at this time due to an error." // Error default for new field
      });
    } finally {
      setIsLoadingNews(false);
      if (!isNewsModalOpen) setIsNewsModalOpen(true); 
    }
  };
  
  const uniqueGroupKeys = useMemo(() => {
    const defaultUncategorizedLabel = groupingCriteria === 'segmentation' ? 'Unsegmented' : 'Unspecified Sector';
    const keys = new Set(storedCompanies.map(c => {
        const value = groupingCriteria === 'segmentation' ? c.segmentation : c.industryType;
        return value || defaultUncategorizedLabel;
    }));
    return ['All', ...Array.from(keys).sort()];
  }, [storedCompanies, groupingCriteria]);

  const companiesToDisplay = useMemo(() => {
    let filtered = [...storedCompanies];
    const defaultUncategorizedLabel = groupingCriteria === 'segmentation' ? 'Unsegmented' : 'Unspecified Sector';

    if (locationFilter.trim() !== '') {
      filtered = filtered.filter(company =>
        company.officeLocation?.toLowerCase().includes(locationFilter.trim().toLowerCase())
      );
    }

    if (activeGroupKey !== 'All') {
      filtered = filtered.filter(company => {
        const groupValue = groupingCriteria === 'segmentation' ? company.segmentation : company.industryType;
        return (groupValue || defaultUncategorizedLabel) === activeGroupKey;
      });
    }

    return filtered.sort((a, b) => a.nameOfCompany.localeCompare(b.nameOfCompany));
  }, [storedCompanies, locationFilter, activeGroupKey, groupingCriteria]);

  const countForGroupKey = useCallback((groupKeyName: string): number => {
    let countBase = [...storedCompanies];
    const defaultUncategorizedLabel = groupingCriteria === 'segmentation' ? 'Unsegmented' : 'Unspecified Sector';

     if (locationFilter.trim() !== '') {
      countBase = countBase.filter(company =>
        company.officeLocation?.toLowerCase().includes(locationFilter.trim().toLowerCase())
      );
    }
    if (groupKeyName === 'All') {
      return countBase.length;
    }
    return countBase.filter(c => {
        const groupValue = groupingCriteria === 'segmentation' ? c.segmentation : c.industryType;
        return (groupValue || defaultUncategorizedLabel) === groupKeyName;
    }).length;
  }, [storedCompanies, locationFilter, groupingCriteria]);

  const handleGroupingChange = (criteria: GroupingCriteria) => {
    setGroupingCriteria(criteria);
    setActiveGroupKey('All'); 
  };

  const getRadioLabelClass = (isActive: boolean) => 
    `px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md cursor-pointer transition-colors duration-150 border
     ${isDarkMode 
        ? (isActive ? 'bg-accent-600 text-white border-accent-500' : 'bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600')
        : (isActive ? 'bg-accent-500 text-white border-accent-600' : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-100')
     }`;


  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-neutral-900 text-neutral-200' : 'bg-neutral-50 text-neutral-800'}`}>
      <header className={`sticky top-0 z-50 shadow-lg ${isDarkMode ? 'bg-neutral-800/80 backdrop-blur-md border-b border-neutral-700' : 'bg-white/80 backdrop-blur-md border-b border-neutral-200'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDarkMode ? 'text-accent-400' : 'text-accent-600'}`}>
            Company Profiler
          </h1>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <IconButton
                icon={<NewsIcon className="w-5 h-5" />}
                onClick={() => {
                    setIsNewsModalOpen(true);
                    if (!newsContent) { 
                        handleFetchNewsOrEvents();
                    }
                }}
                tooltip="CSR Information Hub"
                variant="secondary"
                size="sm"
                disabled={isLoadingNews || !ai} 
             />
             <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" style={{ display: 'none' }} disabled={isLoading || !ai} />
             <IconButton
                icon={<ImportCsvIcon className="w-5 h-5" />}
                onClick={triggerFileInput}
                tooltip="Import Companies from CSV"
                variant="secondary"
                size="sm"
                disabled={isLoading || !ai}
             />
            {storedCompanies.length > 0 && (
               <>
                  <IconButton 
                      icon={<DownloadIcon className="w-5 h-5" />} 
                      onClick={handleExportAllCompanies} 
                      tooltip="Export All to CSV"
                      variant="secondary"
                      size="sm"
                      disabled={isLoading}
                  />
                  <IconButton 
                      icon={<TrashIcon className="w-5 h-5" />} 
                      onClick={handleDeleteAllCompanies} 
                      tooltip="Delete All Data"
                      variant="danger"
                      size="sm"
                      disabled={isLoading}
                  />
              </>
            )}
            <IconButton
              icon={isDarkMode ? <SunIcon className="w-5 h-5 text-yellow-400"/> : <MoonIcon className="w-5 h-5 text-neutral-600" />}
              onClick={toggleTheme}
              tooltip={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              variant="secondary"
              size="sm"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex-grow">
        {!apiKey && (
            <div className={`mb-8 p-4 rounded-lg shadow-lg text-center ${isDarkMode ? 'bg-danger-dark/20 text-danger-light border border-danger-dark' : 'bg-red-50 text-danger-dark border border-red-200'}`}>
                <p className="font-semibold text-lg">API Key Not Found!</p>
                <p className={`mt-1 text-sm ${isDarkMode? 'text-neutral-300' : 'text-neutral-600'}`}>
                    Please set the <code className={`px-1.5 py-0.5 rounded-md text-sm ${isDarkMode ? 'bg-neutral-700 text-amber-400' : 'bg-red-100 text-red-700'}`}>API_KEY</code> environment variable to use AI features.
                </p>
                 <p className={`mt-2 text-xs ${isDarkMode? 'text-neutral-400' : 'text-neutral-500'}`}>
                    For local demos without a bundler, you might need to set <code className={`px-1 py-0.5 rounded ${isDarkMode ? 'bg-neutral-700' : 'bg-neutral-200'}`}>window.process = {'{ env: { API_KEY: "YOUR_KEY" } }'}</code> in the browser console (not for production).
                </p>
            </div>
        )}
        <SearchInput onSearch={handleSearch} isLoading={isLoading || !ai} />

        {isLoading && currentBatchProgress && (
          <div className={`my-8 p-6 rounded-lg shadow-lg text-center ${isDarkMode ? 'bg-neutral-800' : 'bg-white'}`}>
            <LoadingSpinner message={currentBatchProgress} />
          </div>
        )}

        {error && (
          <div className={`my-8 p-4 rounded-lg shadow-lg ${isDarkMode ? 'bg-danger-dark/20 text-danger-light border border-danger-dark' : 'bg-red-50 text-danger-dark border border-red-200'}`} role="alert">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-md">Error Occurred:</h3>
                <button 
                    onClick={() => setError(null)} 
                    className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-danger-dark/50' : 'hover:bg-red-200'}`}
                    aria-label="Dismiss error"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                </button>
            </div>
            <pre className={`whitespace-pre-wrap text-sm mt-2 overflow-x-auto ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>{error}</pre>
          </div>
        )}

        {storedCompanies.length > 0 ? (
          <div className="mt-10 md:mt-12">
            <div className="mb-4">
              <label htmlFor="locationFilterInput" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Filter by Office Location:
              </label>
              <input
                type="text"
                id="locationFilterInput"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="e.g., London, New York, Remote"
                className={`form-input w-full p-2.5 rounded-lg shadow-sm transition-colors duration-200
                            ${isDarkMode 
                              ? 'bg-neutral-700 border-neutral-600 text-neutral-200 placeholder-neutral-500 focus:border-accent-500 focus:ring-accent-500 focus:ring-1' 
                              : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-accent-500 focus:ring-1'
                            }`}
                disabled={isLoading}
                aria-label="Filter companies by office location"
              />
            </div>
            
            <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100/50'}`}>
              <span className={`text-sm font-medium mr-3 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Group by:</span>
              <div className="inline-flex items-center space-x-2" role="radiogroup" aria-label="Grouping criteria">
                <label className={getRadioLabelClass(groupingCriteria === 'segmentation')}>
                  <input
                    type="radio"
                    name="groupingCriteria"
                    value="segmentation"
                    checked={groupingCriteria === 'segmentation'}
                    onChange={() => handleGroupingChange('segmentation')}
                    className="sr-only" 
                    aria-label="Group by Segment"
                  />
                  Segment
                </label>
                <label className={getRadioLabelClass(groupingCriteria === 'industryType')}>
                  <input
                    type="radio"
                    name="groupingCriteria"
                    value="industryType"
                    checked={groupingCriteria === 'industryType'}
                    onChange={() => handleGroupingChange('industryType')}
                    className="sr-only"
                    aria-label="Group by Sector (Industry)"
                  />
                  Sector
                </label>
              </div>
            </div>

            <div className={`mb-5 sm:mb-6 border-b ${isDarkMode ? 'border-neutral-700' : 'border-neutral-300'}`}>
              <nav className="-mb-px flex space-x-3 sm:space-x-4 overflow-x-auto pb-px" aria-label={`Company ${groupingCriteria === 'segmentation' ? 'Segments' : 'Sectors'}`}>
                {uniqueGroupKeys.map(groupKey => (
                  <button
                    key={groupKey}
                    onClick={() => setActiveGroupKey(groupKey)}
                    className={`whitespace-nowrap py-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-150
                      focus:outline-none focus:ring-1 ${isDarkMode ? 'focus:ring-accent-400 focus:ring-offset-neutral-900' : 'focus:ring-accent-500 focus:ring-offset-neutral-50'} rounded-t-md
                      ${activeGroupKey === groupKey
                        ? (isDarkMode ? 'border-accent-400 text-accent-300' : 'border-accent-500 text-accent-600')
                        : (isDarkMode ? 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-500' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-400')
                      }
                    `}
                    aria-current={activeGroupKey === groupKey ? 'page' : undefined}
                  >
                    {groupKey} 
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-normal
                                      ${activeGroupKey === groupKey 
                                        ? (isDarkMode ? 'bg-accent-500/30 text-accent-200' : 'bg-accent-500/20 text-accent-700')
                                        : (isDarkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-200 text-neutral-600')}`}>
                      {countForGroupKey(groupKey)}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl sm:text-2xl font-semibold ${isDarkMode ? 'text-neutral-100' : 'text-neutral-900'}`}>
                {activeGroupKey === 'All' ? `Displaying All Companies` : `${groupingCriteria === 'segmentation' ? 'Segment' : 'Sector'}: ${activeGroupKey}`}
                <span className={`ml-2 text-base font-normal ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                   ({companiesToDisplay.length} found)
                </span>
              </h2>
            </div>

            {companiesToDisplay.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 lg:gap-8">
                {companiesToDisplay.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onRefresh={handleRefreshCompany}
                    onDelete={handleDeleteCompany}
                    onExport={handleExportCompany}
                    onToggleVerification={handleToggleVerification}
                    onSaveEdits={handleSaveEdits}
                    isRefreshing={refreshingCompanyId === company.id}
                    isExpandedInitially={lastSearchedCompanyNames.length === 1 && companyToId(lastSearchedCompanyNames[0]) === company.id && companiesToDisplay.some(c => c.id === company.id)}
                    aiInstance={ai} // Pass the ai instance
                  />
                ))}
              </div>
            ) : (
                 <div className={`text-center mt-10 py-10 px-6 rounded-lg ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                    <svg className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 10l4 4m0-4l-4 4"></path>
                    </svg>
                    <h3 className={`mt-2 text-lg font-medium ${isDarkMode ? 'text-neutral-200' : 'text-neutral-900'}`}>No companies match your filters</h3>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Try adjusting the location filter or selecting a different group.</p>
                </div>
            )}
          </div>
        ) : (
          !isLoading && !error && (
            <div className={`text-center mt-16 py-10 px-6 rounded-lg ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
              <svg className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <h3 className={`mt-2 text-lg font-medium ${isDarkMode ? 'text-neutral-200' : 'text-neutral-900'}`}>No company data</h3>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Get started by searching for a company above or importing a CSV.</p>
            </div>
          )
        )}
      </main>

      <footer className={`${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-100 border-neutral-200'} text-center py-5 border-t mt-auto`}>
        <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-neutral-600'}`}>
          AI-generated information is based on publicly available sources and may require human verification. You can edit any field and mark entries as verified.
        </p>
         {!apiKey && <p className={`text-xs mt-1 ${isDarkMode ? 'text-danger-light/70' : 'text-danger-dark/80'}`}>AI features are currently disabled due to missing API Key.</p>}
      </footer>

      <NewsModal
        isOpen={isNewsModalOpen}
        onClose={() => setIsNewsModalOpen(false)}
        newsContent={newsContent}
        sources={newsSources}
        isLoading={isLoadingNews}
        isDarkMode={isDarkMode}
        onRefresh={handleFetchNewsOrEvents} 
        lastFetchedTimestamp={generalNewsLastFetched} 
      />
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);