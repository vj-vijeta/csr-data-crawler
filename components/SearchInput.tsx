
import React, { useState } from 'react';
import { SearchMode } from '../types';
import { SearchIcon } from './icons';

interface SearchInputProps {
  onSearch: (companyNames: string[], mode: SearchMode) => void;
  isLoading: boolean;
}

type SearchMethod = 'single' | 'batch';

const SearchInput: React.FC<SearchInputProps> = ({ onSearch, isLoading }) => {
  const [singleCompanyName, setSingleCompanyName] = useState('');
  const [batchCompanyNames, setBatchCompanyNames] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>(SearchMode.STANDARD);
  const [activeSearchMethod, setActiveSearchMethod] = useState<SearchMethod>('single');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let names: string[] = [];
    if (activeSearchMethod === 'single') {
      if (singleCompanyName.trim().length > 0) {
        names = [singleCompanyName.trim()];
      } else {
        alert("Please enter a company name.");
        return;
      }
    } else { // batch
      names = batchCompanyNames.split('\n').map(name => name.trim()).filter(name => name.length > 0); // Changed from '\\n' to '\n'
      if (names.length === 0) {
        alert("Please enter at least one company name for batch search.");
        return;
      }
    }
    onSearch(names, searchMode);
  };

  const isDarkMode = document.documentElement.classList.contains('dark');
  
  const getTabClasses = (isActive: boolean) => {
    return `px-4 py-2.5 font-medium text-sm rounded-t-lg focus:outline-none transition-colors duration-150
            ${isActive
              ? (isDarkMode ? 'bg-neutral-700 text-accent-300 border-b-2 border-accent-400' : 'bg-neutral-100 text-accent-600 border-b-2 border-accent-500')
              : (isDarkMode ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-750' : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50')
            }`;
  };

  const currentInputIsEmpty = activeSearchMethod === 'single' ? singleCompanyName.trim().length === 0 : batchCompanyNames.trim().length === 0;

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`rounded-xl shadow-2xl mb-8 sm:mb-12 overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-white border border-neutral-200'}`}
    >
      <div className={`flex border-b ${isDarkMode ? 'border-neutral-700' : 'border-neutral-200'}`}>
        <button
          type="button"
          onClick={() => setActiveSearchMethod('single')}
          className={getTabClasses(activeSearchMethod === 'single')}
          aria-pressed={activeSearchMethod === 'single'}
          disabled={isLoading}
        >
          Single Company Search
        </button>
        <button
          type="button"
          onClick={() => setActiveSearchMethod('batch')}
          className={getTabClasses(activeSearchMethod === 'batch')}
          aria-pressed={activeSearchMethod === 'batch'}
          disabled={isLoading}
        >
          Batch Company Search
        </button>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {activeSearchMethod === 'single' && (
          <div>
            <label htmlFor="singleCompanyName" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
              Company Name
            </label>
            <input
              type="text"
              id="singleCompanyName"
              value={singleCompanyName}
              onChange={(e) => setSingleCompanyName(e.target.value)}
              placeholder="e.g. Google"
              className={`form-input w-full p-3 rounded-lg shadow-sm transition-colors duration-200
                          ${isDarkMode 
                            ? 'bg-neutral-700 border-neutral-600 text-neutral-200 placeholder-neutral-500 focus:border-accent-500 focus:ring-accent-500 focus:ring-2' 
                            : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-accent-500 focus:ring-2'
                          }`}
              disabled={isLoading}
              aria-label="Single company name input"
            />
          </div>
        )}

        {activeSearchMethod === 'batch' && (
          <div>
            <label htmlFor="batchCompanyNames" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
              Company Names <span className="text-xs font-normal opacity-75">(one per line)</span>
            </label>
            <textarea
              id="batchCompanyNames"
              value={batchCompanyNames}
              onChange={(e) => setBatchCompanyNames(e.target.value)}
              rows={3}
              placeholder={
`e.g. Google
Microsoft
Apple`}
              className={`form-textarea w-full p-3 rounded-lg shadow-sm transition-colors duration-200
                          ${isDarkMode 
                            ? 'bg-neutral-700 border-neutral-600 text-neutral-200 placeholder-neutral-500 focus:border-accent-500 focus:ring-accent-500 focus:ring-2' 
                            : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-accent-500 focus:ring-2'
                          }`}
              disabled={isLoading}
              aria-label="Batch company names input, one per line"
            />
          </div>
        )}
        
        <div>
          <label htmlFor="searchMode" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
            Search Mode
          </label>
          <select
            id="searchMode"
            value={searchMode}
            onChange={(e) => setSearchMode(e.target.value as SearchMode)}
            className={`form-select w-full p-3 rounded-lg shadow-sm transition-colors duration-200
                        ${isDarkMode 
                          ? 'bg-neutral-700 border-neutral-600 text-neutral-200 focus:border-accent-500 focus:ring-accent-500 focus:ring-2' 
                          : 'bg-white border-neutral-300 text-neutral-900 focus:border-accent-500 focus:ring-accent-500 focus:ring-2'
                        }`}
            disabled={isLoading}
            aria-label="Select search mode: Standard or Deep"
          >
            <option value={SearchMode.STANDARD}>Standard Search</option>
            <option value={SearchMode.DEEP}>Deep Search (more thorough, slower)</option>
          </select>
        </div>
      </div>
      <div className="p-6 sm:p-8 pt-0">
        <button
          type="submit"
          disabled={isLoading || currentInputIsEmpty}
          className={`w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg shadow-md text-white transition-all duration-200 ease-in-out
                      focus:outline-none focus:ring-2 focus:ring-offset-2 
                      ${isLoading || currentInputIsEmpty
                        ? (isDarkMode ? 'bg-neutral-600 cursor-not-allowed' : 'bg-neutral-400 cursor-not-allowed')
                        : (isDarkMode 
                            ? 'bg-accent-600 hover:bg-accent-700 focus:ring-accent-500 focus:ring-offset-neutral-800' 
                            : 'bg-accent-500 hover:bg-accent-600 focus:ring-accent-600 focus:ring-offset-neutral-50'
                          )
                      }
                      transform hover:scale-[1.01] active:scale-[0.99] disabled:transform-none`}
          aria-label="Search for company data"
        >
          <SearchIcon className="w-5 h-5 mr-2.5" />
          {isLoading ? 'Searching...' : 'Search Companies'}
        </button>
      </div>
    </form>
  );
};

export default SearchInput;
