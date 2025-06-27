
import React, { useState, useEffect } from 'react';
import { Source, StructuredNewsContent } from '../types';
import LoadingSpinner from './LoadingSpinner';
import IconButton from './IconButton'; // Import IconButton
import { RefreshIcon, EducationIcon } from './icons'; // Import RefreshIcon

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  newsContent: StructuredNewsContent | null;
  sources: Source[];
  isLoading: boolean;
  isDarkMode: boolean;
  onRefresh: () => void; 
  lastFetchedTimestamp: string | null; 
}

type NewsModalTab = 'News' | 'Events' | 'Awards' | 'Education CSR'; // Added 'Education CSR'

const NewsModal: React.FC<NewsModalProps> = ({
  isOpen,
  onClose,
  newsContent,
  sources,
  isLoading,
  isDarkMode,
  onRefresh,
  lastFetchedTimestamp,
}) => {
  const [activeTab, setActiveTab] = useState<NewsModalTab>('News');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('News'); // Default to 'News' tab when modal opens
    }
  }, [isOpen]); 

  if (!isOpen) return null;

  const getIconForNewsTab = (tabName: NewsModalTab, isActive: boolean) => {
    const iconClass = `w-4 h-4 mr-1.5 sm:mr-2 ${isActive ? (isDarkMode ? 'text-accent-300' : 'text-accent-600') : (isDarkMode ? 'text-neutral-400 group-hover:text-neutral-200' : 'text-neutral-500 group-hover:text-neutral-700')}`;
    if (tabName === 'Education CSR') return <EducationIcon className={iconClass} />;
    return null; // Or generic icons for other tabs if needed
  };
  
  const renderActiveTabContent = () => {
    if (!newsContent && !isLoading) { 
      return "No information available at the moment. Try refreshing.";
    }
    
    const currentDisplayContent = newsContent || { news: "", events: "", awards: "", educationCsr: "" };

    switch (activeTab) {
      case 'News':
        return currentDisplayContent.news || "No news information available.";
      case 'Events':
        return currentDisplayContent.events || "No events information available.";
      case 'Awards':
        return currentDisplayContent.awards || "No awards information available.";
      case 'Education CSR': // Handle new tab
        return currentDisplayContent.educationCsr || "No specific education CSR information available.";
      default:
        return "No information available.";
    }
  };
  
  const getTabButtonClass = (tabName: NewsModalTab) => {
    const isActive = activeTab === tabName;
    return `group px-3 py-2 sm:px-4 sm:py-2.5 rounded-t-lg text-sm font-medium focus:outline-none transition-colors duration-150 flex items-center
            ${isActive 
              ? (isDarkMode ? 'bg-neutral-700 text-accent-300 border-b-2 border-accent-400' : 'bg-neutral-100 text-accent-600 border-b-2 border-accent-500')
              : (isDarkMode ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-750' : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/60')
            }`;
  };

  const TABS_ORDER: NewsModalTab[] = ['News', 'Events', 'Awards', 'Education CSR'];


  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-modal-title"
    >
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden
                    ${isDarkMode ? 'bg-neutral-800 text-neutral-200 border border-neutral-700' : 'bg-white text-neutral-800 border border-neutral-200'} 
                    rounded-xl shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-6 pt-5 sm:px-8 sm:pt-6 pb-3 flex justify-between items-start ${isDarkMode ? 'border-b border-neutral-700' : 'border-b border-neutral-200'}`}>
          <div>
            <h2 id="news-modal-title" className={`text-xl sm:text-2xl font-semibold ${isDarkMode ? 'text-accent-400' : 'text-accent-600'}`}>
              CSR Information Hub
            </h2>
            {lastFetchedTimestamp && (
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Last Updated: {new Date(lastFetchedTimestamp).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <IconButton
                icon={<RefreshIcon className="w-5 h-5"/>}
                onClick={onRefresh}
                tooltip="Refresh Information"
                variant="ghost"
                size="sm"
                disabled={isLoading}
            />
            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors
                          ${isDarkMode ? 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100' : 'text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700'}`}
              aria-label="Close news modal"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
          </div>
        </div>
        
        <div className={`px-6 sm:px-8 pt-3 ${isDarkMode ? '' : ''}`}>
             <div className={`flex border-b ${isDarkMode ? 'border-neutral-700' : 'border-neutral-200'} -mx-6 sm:-mx-8 px-6 sm:px-8`}>
                {TABS_ORDER.map(tab => ( // Use TABS_ORDER here
                    <button key={tab} onClick={() => setActiveTab(tab)} className={getTabButtonClass(tab)}>
                    {getIconForNewsTab(tab, activeTab === tab)}
                    {tab}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 sm:p-8">
          {isLoading ? (
            <div className="py-10">
              <LoadingSpinner message={`Fetching latest ${activeTab.toLowerCase()}...`} />
            </div>
          ) : (
            <>
              <div 
                  className={`prose prose-sm sm:prose-base max-w-none 
                              ${isDarkMode ? 'prose-invert text-neutral-300' 
                                            : 'text-neutral-700'} 
                              prose-headings:font-semibold prose-headings:mb-3 prose-headings:mt-5 first:prose-headings:mt-0
                              prose-p:mb-3 prose-ul:my-3 prose-ul:pl-5 prose-li:mb-1
                              prose-a:text-accent-500 hover:prose-a:text-accent-600
                              dark:prose-a:text-accent-400 dark:hover:prose-a:text-accent-300
                              prose-strong:${isDarkMode ? 'text-neutral-100' : 'text-neutral-900'}
                              whitespace-pre-wrap leading-relaxed`}
              >
                {renderActiveTabContent().split('\n').map((line, index, arr) => (
                    <React.Fragment key={index}>
                        {line}
                        {index < arr.length - 1 && <br />}
                    </React.Fragment>
                ))}
              </div>

              {sources && sources.length > 0 && (activeTab === 'News' || activeTab === 'Education CSR') && ( // Show sources for News and Education CSR
                <div className="mt-8">
                  <h3 className={`text-md sm:text-lg font-semibold mb-3 pt-4 border-t ${isDarkMode ? 'border-neutral-700 text-neutral-100' : 'border-neutral-200 text-neutral-700'}`}>
                    Overall Sources for this Information:
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    {sources.map((source, index) => (
                      <li key={index} className={isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}>
                        <a
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={source.uri}
                          className={`hover:underline break-all ${isDarkMode ? 'text-accent-400 hover:text-accent-300' : 'text-accent-500 hover:text-accent-600'}`}
                        >
                          {source.title && source.title !== 'N/A' ? source.title : source.uri}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(!sources || sources.length === 0) && newsContent && (activeTab === 'News' || activeTab === 'Education CSR') && !isLoading && (
                   <p className={`mt-4 text-xs italic ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      (No specific web sources were cited by the AI for this summary.)
                   </p>
              )}
            </>
          )}
        </div>
        <div className={`px-6 pb-6 sm:px-8 sm:pb-8 pt-4 ${isDarkMode ? 'border-t border-neutral-700' : 'border-t border-neutral-200'}`}>
            <button
                onClick={onClose}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-sm transition-colors
                            ${isDarkMode ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200' : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700'}`}
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default NewsModal;