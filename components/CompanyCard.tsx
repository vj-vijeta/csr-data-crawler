
import React, { useState, useEffect, useCallback } from 'react';
import { StoredCompany, SearchMode, CompanyData, Source, GoogleGenAI, GenerateContentResponse, GroundingChunk } from '../types'; // Added GoogleGenAI types
import { GEMINI_MODEL_TEXT } from '../constants';
import CompanyDetailsDisplay from './CompanyDetailsDisplay';
import IconButton from './IconButton';
import { RefreshIcon, ExportIcon, DeleteIcon, ChevronDownIcon, ChevronUpIcon, EducationIcon, BudgetIcon, ContactsIcon, InfoIcon, StrategyIcon, SourcesIcon, VerifiedIcon, EditIcon, SaveIcon, CancelIcon, NewsIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';
import { produce } from 'https://esm.sh/immer@10.0.3';

const CARD_BASE_TAB_OPTIONS = ["General Info", "CSR & Education", "Budget", "Contacts", "Strategic", "Sources"];

interface CompanySpecificCsrNews {
  text: string | null;
  sources: Source[];
  fetchedDate: string | null;
}

interface CompanyCardProps {
  company: StoredCompany;
  onRefresh: (companyId: string, searchMode: SearchMode) => void;
  onDelete: (companyId: string) => void;
  onExport: (companyId: string) => void;
  onToggleVerification: (companyId: string) => void;
  onSaveEdits: (companyId: string, editedData: CompanyData) => void;
  isRefreshing: boolean;
  isExpandedInitially?: boolean;
  aiInstance: GoogleGenAI | null; // Added aiInstance prop
}

const getIconForTab = (tabName: string, className: string = "w-4 h-4 mr-2", isActive: boolean) => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const iconColor = isActive ? (isDarkMode ? 'text-white' : 'text-white') : (isDarkMode ? 'text-neutral-400 group-hover:text-neutral-200' : 'text-neutral-500 group-hover:text-neutral-700');
  
  switch (tabName) {
    case "General Info": return <InfoIcon className={`${className} ${iconColor}`} />;
    case "CSR & Education": return <EducationIcon className={`${className} ${iconColor}`} />;
    case "Budget": return <BudgetIcon className={`${className} ${iconColor}`} />;
    case "Contacts": return <ContactsIcon className={`${className} ${iconColor}`} />;
    case "Strategic": return <StrategyIcon className={`${className} ${iconColor}`} />;
    case "Sources": return <SourcesIcon className={`${className} ${iconColor}`} />;
    case "Company News": return <NewsIcon className={`${className} ${iconColor}`} />; // Icon for new tab
    default: return null;
  }
};

const CompanyCard: React.FC<CompanyCardProps> = ({ 
  company, 
  onRefresh, 
  onDelete, 
  onExport, 
  onToggleVerification, 
  onSaveEdits,
  isRefreshing, 
  isExpandedInitially = false,
  aiInstance // Destructure aiInstance
}) => {
  const [isExpanded, setIsExpanded] = useState(isExpandedInitially);
  const [activeTab, setActiveTab] = useState<string>(CARD_BASE_TAB_OPTIONS[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCompanyData, setEditedCompanyData] = useState<StoredCompany>(company);

  // State for company-specific CSR news
  const [companySpecificCsrNews, setCompanySpecificCsrNews] = useState<CompanySpecificCsrNews | null>(null);
  const [isLoadingCompanySpecificCsrNews, setIsLoadingCompanySpecificCsrNews] = useState<boolean>(false);
  const [companySpecificCsrError, setCompanySpecificCsrError] = useState<string | null>(null);
  
  const currentTabOptions = companySpecificCsrNews || isLoadingCompanySpecificCsrNews ? [...CARD_BASE_TAB_OPTIONS, "Company News"] : CARD_BASE_TAB_OPTIONS;


  useEffect(() => {
    setIsExpanded(isExpandedInitially);
  }, [isExpandedInitially]);

  useEffect(() => {
    if (!isEditing) {
      setEditedCompanyData(company);
    }
  }, [company, isEditing]);

  const isDarkMode = document.documentElement.classList.contains('dark');
  const hasEducationFocus = company.csrEducationFocus.doesEducation === true;

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedCompanyData(company); 
      setIsEditing(false);
    } else {
      setEditedCompanyData(JSON.parse(JSON.stringify(company))); 
      setIsEditing(true);
      if (!isExpanded) setIsExpanded(true); 
      if (activeTab === "Company News") setActiveTab(CARD_BASE_TAB_OPTIONS[0]); // Switch from news tab if editing
    }
  };

  const handleSave = () => {
    onSaveEdits(company.id, editedCompanyData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedCompanyData(JSON.parse(JSON.stringify(company)));
    setIsEditing(false);
  };

  const handleFieldChange = useCallback((path: string, value: any) => {
    setEditedCompanyData(
      produce(draft => {
        let current = draft as any;
        const keys = path.split('.');
        keys.forEach((key, index) => {
          if (index === keys.length - 1) {
            current[key] = value;
          } else {
            if (!current[key]) {
              current[key] = Number.isInteger(Number(keys[index+1])) ? [] : {};
            }
            current = current[key];
          }
        });
      })
    );
  }, []);
  
  const cardData = isEditing ? editedCompanyData : company;

  const handleFetchCompanySpecificCsrNews = async () => {
    if (!aiInstance) {
      setCompanySpecificCsrError("Gemini API not initialized. Cannot fetch company news.");
      return;
    }
    setIsLoadingCompanySpecificCsrNews(true);
    setCompanySpecificCsrError(null);
    setCompanySpecificCsrNews(null); // Clear previous news

    const prompt = `Provide a concise summary of recent (last 3-6 months) CSR news and initiatives specifically for "${company.nameOfCompany}". Focus on their community engagement, environmental efforts, and education-related programs if any. Include direct URLs to the news articles or official press releases where available. Use Google Search and list the source URLs. If no specific recent CSR news is found for this company, state that clearly.`;

    try {
      const response: GenerateContentResponse = await aiInstance.models.generateContent({
        model: GEMINI_MODEL_TEXT,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const newsText = response.text || "No specific CSR news summary found for this company at this time.";
      const sources: Source[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((chunk: GroundingChunk) => chunk.web && chunk.web.uri)
        .map((chunk: GroundingChunk) => ({
          uri: chunk.web!.uri!,
          title: chunk.web!.title || chunk.web!.uri!,
        })) || [];
      
      setCompanySpecificCsrNews({
        text: newsText,
        sources: sources,
        fetchedDate: new Date().toISOString(),
      });
      if (!isExpanded) setIsExpanded(true);
      setActiveTab("Company News"); // Switch to the news tab

    } catch (err) {
      console.error(`Error fetching CSR news for ${company.nameOfCompany}:`, err);
      setCompanySpecificCsrError(`Failed to fetch CSR news: ${(err as Error).message}`);
      setCompanySpecificCsrNews({ text: `Failed to load news: ${(err as Error).message}`, sources: [], fetchedDate: new Date().toISOString()});
    } finally {
      setIsLoadingCompanySpecificCsrNews(false);
    }
  };


  return (
    <div 
      className={`rounded-xl shadow-xl transition-all duration-300 ease-in-out overflow-hidden
                  ${isDarkMode ? 'bg-neutral-800 border border-neutral-700 hover:shadow-card-hover' : 'bg-white border border-neutral-200 hover:shadow-lg'}
                  ${hasEducationFocus && !isEditing ? (isDarkMode ? 'border-l-4 border-highlight-dark' : 'border-l-4 border-highlight-DEFAULT') : ''}
                  ${cardData.manuallyVerified && !isEditing ? (isDarkMode ? 'ring-2 ring-success-dark' : 'ring-2 ring-success-DEFAULT') : '' }
                  ${isEditing ? (isDarkMode ? 'ring-2 ring-accent-dark' : 'ring-2 ring-accent-DEFAULT') : ''}`}
    >
      <div 
        className={`p-5 sm:p-6 flex justify-between items-center cursor-pointer transition-colors duration-200
                    ${isDarkMode ? 'hover:bg-neutral-750' : 'hover:bg-neutral-50'}
                    ${isEditing ? (isDarkMode ? 'bg-neutral-750' : 'bg-neutral-100') : ''}`}
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={isEditing ? -1 : 0}
        onKeyDown={(e) => !isEditing && (e.key === 'Enter' || e.key === ' ') && setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`company-details-${company.id}`}
      >
        <div className="flex-grow min-w-0 pr-3">
          <h3 className={`text-lg sm:text-xl font-semibold truncate ${isDarkMode ? (hasEducationFocus ? 'text-highlight-DEFAULT' : 'text-neutral-100') : (hasEducationFocus ? 'text-highlight-dark' : 'text-neutral-900')}`}>
            {cardData.manuallyVerified && <VerifiedIcon className={`inline w-5 h-5 mr-1.5 align-text-bottom ${isDarkMode ? 'text-success-light' : 'text-success-dark'}`} title="Manually Verified" />}
            {cardData.nameOfCompany}
            {hasEducationFocus && <EducationIcon className={`inline w-5 h-5 ml-1.5 align-text-bottom ${isDarkMode ? 'text-highlight-DEFAULT': 'text-highlight-dark'}`} />}
          </h3>
          <p className={`text-xs sm:text-sm mt-0.5 truncate ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Last Updated: {new Date(cardData.lastFetched).toLocaleString()}
            {cardData.industryType && cardData.industryType !== "N/A" && ` | ${cardData.industryType}`}
          </p>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
          {isEditing ? (
            <>
              <IconButton
                icon={<SaveIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                tooltip="Save Changes"
                variant="ghost" 
                size="sm"
                className={isDarkMode ? "text-success-light hover:bg-success-dark/30" : "text-success-dark hover:bg-success-light/30"}
              />
              <IconButton
                icon={<CancelIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                tooltip="Cancel Edits"
                variant="ghostDanger"
                size="sm"
              />
            </>
          ) : (
            <>
              <IconButton
                icon={<EditIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                onClick={(e) => { e.stopPropagation(); handleEditToggle(); }}
                tooltip="Edit Company Data"
                variant="ghost"
                size="sm"
              />
               <IconButton
                  icon={<NewsIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                  onClick={(e) => { e.stopPropagation(); handleFetchCompanySpecificCsrNews(); }}
                  tooltip="Get CSR News for this Company"
                  variant="ghost"
                  size="sm"
                  disabled={isLoadingCompanySpecificCsrNews || !aiInstance}
                />
              {isRefreshing || isLoadingCompanySpecificCsrNews ? ( // Show spinner if refreshing main data OR company news
                <div className="p-1.5"><LoadingSpinner size="sm" /></div>
              ) : (
                <IconButton
                  icon={<RefreshIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                  onClick={(e) => { e.stopPropagation(); onRefresh(company.id, SearchMode.STANDARD); }}
                  tooltip="Refresh Data (Standard)"
                  variant="ghost"
                  size="sm"
                  disabled={!aiInstance}
                />
              )}
              <IconButton
                icon={<VerifiedIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${company.manuallyVerified ? (isDarkMode ? 'text-success-light' : 'text-success-dark') : ''}`} />}
                onClick={(e) => { e.stopPropagation(); onToggleVerification(company.id); }}
                tooltip={company.manuallyVerified ? "Unmark as Verified" : "Mark as Verified"}
                variant="ghost"
                size="sm"
              />
              <IconButton
                icon={<ExportIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                onClick={(e) => { e.stopPropagation(); onExport(company.id); }}
                tooltip="Export to CSV"
                variant="ghost"
                size="sm"
              />
              <IconButton
                icon={<DeleteIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                onClick={(e) => { e.stopPropagation(); onDelete(company.id); }}
                tooltip="Delete Company"
                variant="ghostDanger"
                size="sm"
              />
            </>
          )}
          {!isEditing && (
            <span 
                className={`transform transition-transform duration-200 p-1 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded);}}
            >
              <ChevronDownIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`} />
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div id={`company-details-${company.id}`} className={`border-t ${isDarkMode ? 'border-neutral-700' : 'border-neutral-200'}`}>
          <div className={`px-3 py-2 sm:px-4 sm:py-2.5 ${isDarkMode ? 'bg-neutral-750 border-b border-neutral-700' : 'bg-neutral-50 border-b border-neutral-200'}`}>
            <nav className="flex flex-wrap -mb-px gap-x-2 sm:gap-x-3 gap-y-1" aria-label="Tabs">
              {currentTabOptions.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`group inline-flex items-center shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2 border border-transparent rounded-md text-xs sm:text-sm font-medium leading-5 transition-all duration-150 ease-in-out
                    focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-accent-500 focus:ring-offset-neutral-750' : 'focus:ring-accent-500 focus:ring-offset-neutral-50'}
                    ${activeTab === tab 
                      ? (isDarkMode ? 'bg-accent-600 text-white shadow-md' : 'bg-accent-500 text-white shadow-sm')
                      : (isDarkMode ? 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700' : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100')
                    }
                    ${tab === "Company News" && isLoadingCompanySpecificCsrNews ? 'animate-pulse' : ''}
                  `}
                  aria-current={activeTab === tab ? 'page' : undefined}
                  disabled={isRefreshing || (isEditing && tab === "Company News")} 
                >
                  {getIconForTab(tab, `w-4 h-4 mr-1.5 sm:mr-2`, activeTab === tab)}
                  {tab}
                </button>
              ))}
            </nav>
          </div>
          {activeTab === "Company News" ? (
             <div className={`p-4 sm:p-5 md:p-6 ${isDarkMode ? 'bg-neutral-800' : 'bg-white'} rounded-b-lg`}>
                {isLoadingCompanySpecificCsrNews && <LoadingSpinner message="Fetching company specific CSR news..." />}
                {companySpecificCsrError && !isLoadingCompanySpecificCsrNews && (
                    <p className={`text-sm ${isDarkMode ? 'text-danger-light' : 'text-danger-dark'}`}>{companySpecificCsrError}</p>
                )}
                {companySpecificCsrNews && !isLoadingCompanySpecificCsrNews && !companySpecificCsrError && (
                    <div>
                        <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'} mb-2`}>
                            News fetched on: {new Date(companySpecificCsrNews.fetchedDate!).toLocaleString()}
                        </p>
                        <div 
                            className={`prose prose-sm sm:prose-base max-w-none 
                                        ${isDarkMode ? 'prose-invert text-neutral-300' : 'text-neutral-700'} 
                                        whitespace-pre-wrap leading-relaxed`}
                        >
                            {companySpecificCsrNews.text}
                        </div>
                        {companySpecificCsrNews.sources.length > 0 && (
                            <div className="mt-4">
                                <h4 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>Sources:</h4>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    {companySpecificCsrNews.sources.map((src, idx) => (
                                        <li key={idx}>
                                            <a href={src.uri} target="_blank" rel="noopener noreferrer" className={`hover:underline ${isDarkMode ? 'text-accent-400' : 'text-accent-500'}`}>
                                                {src.title || src.uri}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                {!companySpecificCsrNews && !isLoadingCompanySpecificCsrNews && !companySpecificCsrError && (
                     <p className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        Click the "Get CSR News for this Company" button in the header to fetch specific news.
                     </p>
                )}
             </div>
          ) : (
            <CompanyDetailsDisplay 
              companyData={cardData}
              activeTab={activeTab} 
              isEditing={isEditing}
              onFieldChange={handleFieldChange}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyCard;
