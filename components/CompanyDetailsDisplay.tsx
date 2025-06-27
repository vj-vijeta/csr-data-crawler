import React, { useCallback } from 'react';
import { StoredCompany, BudgetItem, CSRCommitteeMember, ContactPerson, POC, Source, CompanyData } from '../types';
import { EducationIcon, BudgetIcon, ContactsIcon, InfoIcon, StrategyIcon, SourcesIcon, VerifiedIcon, PlusCircleIcon, TrashIcon } from './icons'; // Added Plus/Trash
import IconButton from './IconButton'; // Added IconButton import
import { produce } from 'https://esm.sh/immer@10.0.3';


interface CompanyDetailsDisplayProps {
  companyData: StoredCompany; // Renamed to avoid confusion, this is the data to display/edit
  activeTab: string;
  isEditing: boolean;
  onFieldChange: (path: string, value: any) => void;
}

const getInputBorderClasses = (isDarkMode: boolean, hasError?: boolean) => {
  if (hasError) return 'border-danger-dark focus:border-danger-dark focus:ring-danger-dark';
  return isDarkMode
    ? 'bg-neutral-700 border-neutral-600 text-neutral-200 placeholder-neutral-500 focus:border-accent-500 focus:ring-accent-500 focus:ring-1'
    : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-accent-500 focus:ring-1';
};

const commonInputClass = "form-input mt-1 block w-full text-sm rounded-md shadow-sm transition-colors duration-150";
const commonTextareaClass = "form-textarea mt-1 block w-full text-sm rounded-md shadow-sm transition-colors duration-150";
const commonCheckboxClass = "form-checkbox mt-1 rounded text-accent-500 focus:ring-accent-400";

// Define the specific input type union
type SpecificInputType = 'text' | 'textarea' | 'checkbox' | 'url' | 'json' | 'string_array' | 'object_array';

interface DetailItemProps {
    label: string;
    value: React.ReactNode;
    isHighlighted?: boolean;
    className?: string;
    isLast?: boolean;
    isEditing?: boolean;
    path?: string; // Path for onFieldChange, e.g., "nameOfCompany" or "csrEducationFocus.educationSpend"
    onFieldChange?: (path: string, value: any) => void;
    inputType?: SpecificInputType; // Use the specific union type
    objectSchema?: any; // For object_array to help with adding new items
    originalValue?: any; // To determine the type for rendering input
}


const DetailItem: React.FC<DetailItemProps> = ({ label, value, isHighlighted, className, isLast, isEditing, path, onFieldChange, inputType = 'text', originalValue }) => {
  const isDarkMode = document.documentElement.classList.contains('dark');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (path && onFieldChange) {
      if (e.target.type === 'checkbox') {
        onFieldChange(path, (e.target as HTMLInputElement).checked);
      } else {
        onFieldChange(path, e.target.value);
      }
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     if (path && onFieldChange) {
      try {
        const parsed = JSON.parse(e.target.value);
        onFieldChange(path, parsed);
      } catch (err) {
        // Handle invalid JSON, maybe set an error state or ignore
        console.warn("Invalid JSON in textarea:", e.target.value);
        onFieldChange(path, e.target.value); // Store as string if invalid, to allow correction
      }
    }
  }

  let displayValue = value;
  let editUI = null;

  if (isEditing && path && onFieldChange) {
    const currentValue = typeof originalValue !== 'undefined' ? originalValue : value;
    const inputClasses = `${commonInputClass} ${getInputBorderClasses(isDarkMode)}`;
    const textareaClasses = `${commonTextareaClass} ${getInputBorderClasses(isDarkMode)}`;

    switch (inputType) {
      case 'checkbox':
        editUI = <input type="checkbox" className={`${commonCheckboxClass} ${isDarkMode ? 'bg-neutral-600 border-neutral-500' : 'border-neutral-300'}`} checked={!!currentValue} onChange={handleChange} aria-label={label}/>;
        break;
      case 'textarea':
        editUI = <textarea value={currentValue as string || ''} onChange={handleChange} rows={3} className={textareaClasses} aria-label={label}/>;
        break;
      case 'json': // For complex objects/arrays shown as JSON
        editUI = <textarea
                    value={typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue, null, 2)}
                    onChange={handleJsonChange}
                    rows={5}
                    className={textareaClasses}
                    aria-label={label}
                  />;
        break;
      // Note: 'string_array' and 'object_array' are handled by specific renderers further down.
      default: // text, url
        editUI = <input type={inputType === 'url' ? 'url' : 'text'} value={currentValue as string || ''} onChange={handleChange} className={inputClasses} aria-label={label}/>;
    }
  } else { // View mode rendering
      if (value === null || typeof value === 'undefined' || (typeof value === 'string' && (value.trim() === '' || value.toLowerCase() === 'n/a'))) {
        displayValue = <span className={isDarkMode ? "text-neutral-500 italic" : "text-neutral-400 italic"}>N/A</span>;
      } else if (typeof value === 'boolean') {
        displayValue = value ?
          <span className={`inline-flex items-center ${isDarkMode ? "text-success-light" : "text-success-dark"}`}>
            {label === "Manually Verified" && <VerifiedIcon className="w-4 h-4 mr-1.5" />} Yes
          </span> :
          <span className={isDarkMode ? "text-danger-light" : "text-danger-dark"}>No</span>;
      } else if (Array.isArray(value) && value.length === 0) {
        displayValue = <span className={isDarkMode ? "text-neutral-500 italic" : "text-neutral-400 italic"}>N/A</span>;
      } else if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
        displayValue = <a href={value} target="_blank" rel="noopener noreferrer" className={`hover:underline break-all ${isDarkMode ? 'text-accent-400 hover:text-accent-300' : 'text-accent-500 hover:text-accent-600'}`}>{value}</a>;
      }
  }

  return (
    <div className={`py-3 sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-1 ${isLast ? '' : (isDarkMode ? 'border-b border-neutral-700' : 'border-b border-neutral-200')} ${isHighlighted && !isEditing ? (isDarkMode ? 'bg-highlight-dark/10 rounded-md px-2 -mx-2' : 'bg-highlight-DEFAULT/20 rounded-md px-2 -mx-2') : ''} ${className || ''}`}>
      <dt className={`text-sm font-medium ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>{label}</dt>
      <dd className={`mt-1 text-sm sm:mt-0 sm:col-span-2 ${isDarkMode ? 'text-neutral-200' : 'text-neutral-700'}`}>
        {isEditing && path ? editUI : displayValue}
      </dd>
    </div>
  );
};


const renderArrayOrNA = (
    items: any[] | null | undefined, // Type hint is array, but runtime might differ
    renderItem: (item: any, index: number, isEditing?: boolean, path?: string, onFieldChange?: (path: string, value: any) => void) => React.ReactNode,
    isDarkMode: boolean,
    isEditing?: boolean,
    path?: string, // base path for array, e.g., "projectLocations"
    onFieldChange?: (path: string, value: any) => void,
    onAddItem?: (basePath: string) => void,
    onRemoveItem?: (basePath: string, index: number) => void,
    itemType?: 'string' | 'object' // to help with add new items
) => {
  const isActualArray = Array.isArray(items);
  const showNA = !isActualArray || (isActualArray && items.length === 0);

  if (isEditing && path && onFieldChange) {
    return (
      <div className="space-y-2">
        {isActualArray && items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="flex-grow">
              {renderItem(item, index, isEditing, `${path}.${index}`, onFieldChange)}
            </div>
            {onRemoveItem && <IconButton icon={<TrashIcon className="w-4 h-4"/>} onClick={() => onRemoveItem(path, index)} tooltip="Remove Item" variant="ghostDanger" size="sm"/>}
          </div>
        ))}
        {onAddItem && (
          <button
            type="button"
            onClick={() => onAddItem(path)}
            className={`mt-2 inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded shadow-sm ${isDarkMode ? 'text-neutral-900 bg-accent-400 hover:bg-accent-300' : 'text-white bg-accent-500 hover:bg-accent-600'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500`}
          >
            <PlusCircleIcon className="w-4 h-4 mr-1.5"/> Add New
          </button>
        )}
        {showNA && !onAddItem && <span className={isDarkMode ? "text-neutral-500 italic" : "text-neutral-400 italic"}>N/A - No items to edit</span>}
      </div>
    );
  }

  // View mode
  if (showNA) return <span className={isDarkMode ? "text-neutral-500 italic" : "text-neutral-400 italic"}>N/A</span>;
  
  // If we reach here, isActualArray is true and items.length > 0
  return <ul className={`list-disc list-inside space-y-1.5 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{items.map((item, index) => renderItem(item, index, false))}</ul>;
};

interface BaseDisplayConfig {
    label: string;
    isHighlighted?: boolean;
}
interface EditableDisplayConfig extends BaseDisplayConfig {
    path: string;
    value: string | number | boolean | string[] | Record<string, any> | null | undefined; // The raw data
    inputType?: SpecificInputType;
    objectSchema?: () => any; // For adding new items to object_array
}
interface ReadOnlyDisplayConfig extends BaseDisplayConfig {
    value: React.ReactNode; // Already formatted for display
    path?: undefined;
    inputType?: undefined;
}
type DisplayConfig = EditableDisplayConfig | ReadOnlyDisplayConfig;


const CompanyDetailsDisplay: React.FC<CompanyDetailsDisplayProps> = ({ companyData, activeTab, isEditing, onFieldChange }) => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const c = companyData; // shorthand

  const handleArrayItemChange = useCallback((basePath: string, index: number, value: string) => {
      const fullPath = `${basePath}.${index}`;
      onFieldChange(fullPath, value);
  }, [onFieldChange]);

  const handleObjectInArrayChange = useCallback((basePath: string, index: number, field: string, value: any) => {
    const fullPath = `${basePath}.${index}.${field}`;
    onFieldChange(fullPath, value);
  }, [onFieldChange]);


  const handleAddItem = useCallback((basePath: string, newItemTemplate: any = "") => {
    const keys = basePath.split('.');
    let currentItemsContainer = c as any;
    for(let i = 0; i < keys.length -1; i++) {
        currentItemsContainer = currentItemsContainer[keys[i]];
         if (!currentItemsContainer) return; // Should not happen if path is correct
    }
    const arrayKey = keys[keys.length -1];
    const currentItems = currentItemsContainer[arrayKey] || [];

    const newArray = [...currentItems, typeof newItemTemplate === 'function' ? newItemTemplate() : newItemTemplate];
    onFieldChange(basePath, newArray);
  }, [onFieldChange, c]);

  const handleRemoveItem = useCallback((basePath: string, index: number) => {
    const keys = basePath.split('.');
    let currentItemsContainer = c as any;
    for(let i = 0; i < keys.length -1; i++) {
        currentItemsContainer = currentItemsContainer[keys[i]];
        if (!currentItemsContainer) return;
    }
    const arrayKey = keys[keys.length -1];
    const currentItems = currentItemsContainer[arrayKey];

    if (currentItems && Array.isArray(currentItems)) {
      const newArray = currentItems.filter((_, i) => i !== index);
      onFieldChange(basePath, newArray);
    }
  }, [onFieldChange, c]);

  const defaultContactPerson = (): ContactPerson => ({ name: null, designation: null, email: null, phone: null, notes: null });
  const defaultPoc = (): POC => ({ ...defaultContactPerson(), pocNumber: (c.pointsOfContact?.length || 0) + 1 });
  const defaultCsrMember = (): CSRCommitteeMember => ({ name: null, designation: null, contactInfo: null, linkedInProfileUrl: null });
  const defaultBudgetItem = (): BudgetItem => ({ year: `${new Date().getFullYear()}-${new Date().getFullYear()+1}`, totalBudget: null, educationBudget: null});


  const renderContent = () => {
    switch (activeTab) {
      case "General Info":
        const generalInfoItems: DisplayConfig[] = [
          { label: "Company Name", path: "nameOfCompany", value: c.nameOfCompany, isHighlighted: true },
          { label: "LinkedIn URL", path: "companyLinkedInURL", value: c.companyLinkedInURL, inputType: 'url' },
          { label: "CIN No. (AI)", path: "cinNumber", value: c.cinNumber },
          { label: "CSV CIN No.", path: "csvCinNumber", value: c.csvCinNumber },
          { label: "Manually Verified", path: "manuallyVerified", value: c.manuallyVerified, inputType: 'checkbox', isHighlighted: c.manuallyVerified },
          { label: "Segmentation", path: "segmentation", value: c.segmentation },
          { label: "Priority", path: "priority", value: c.priority },
          { label: "SPOC", path: "spoc", value: c.spoc },
          { label: "Promoter Led", path: "promoterLed", value: c.promoterLed, inputType: 'checkbox' },
          { label: "Name of Promoter", path: "nameOfPromoter", value: c.nameOfPromoter },
          { label: "Industry Type", path: "industryType", value: c.industryType },
          { label: "Entity Type", path: "entityType", value: c.entityType },
          { label: "Office Location", path: "officeLocation", value: c.officeLocation, inputType: 'textarea' },
          { label: "Project Locations", path: "projectLocations", value: c.projectLocations, inputType: 'string_array' },
          { label: "Domain", path: "domain", value: c.domain, inputType: 'url' },
          { label: "Data Retrieved", value: new Date(c.dataRetrievalDate).toLocaleDateString() }
        ];
        return <dl>
          {generalInfoItems.map((item, index) => {
             const itemIsEditable = 'path' in item && !!item.path;
             let displayOrEditValue: React.ReactNode;

             if (itemIsEditable && item.inputType === 'string_array') {
                displayOrEditValue = renderArrayOrNA(
                    item.value as string[] | null,
                    (val, idx, isEdit, itemPath, itemChangeCb) => isEdit && itemPath && itemChangeCb ?
                        <input type="text" value={val as string || ''} onChange={e => itemChangeCb(itemPath, e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} aria-label={`${item.label} item ${idx + 1}`}/>
                        : <li key={idx}>{val}</li>,
                    isDarkMode, isEditing, item.path, onFieldChange,
                    () => handleAddItem(item.path!, ""),
                    (basePath, itemIdx) => handleRemoveItem(basePath, itemIdx)
                );
             } else {
                displayOrEditValue = item.value as React.ReactNode; // For ReadOnly or simple editable values
             }

            return <DetailItem
              key={itemIsEditable ? item.path : item.label}
              label={item.label}
              value={displayOrEditValue}
              isHighlighted={item.isHighlighted}
              isLast={index === generalInfoItems.length - 1}
              isEditing={itemIsEditable && isEditing}
              path={itemIsEditable ? item.path : undefined}
              onFieldChange={itemIsEditable ? onFieldChange : undefined}
              inputType={itemIsEditable ? item.inputType : undefined}
              originalValue={itemIsEditable ? item.value : undefined}
            />
          })}
        </dl>;

      case "CSR & Education":
        const csrItems: DisplayConfig[] = [
          { label: "Focus on Education?", path: "csrEducationFocus.doesEducation", value: c.csrEducationFocus.doesEducation, inputType: 'checkbox', isHighlighted: true },
          { label: "Education Spend", path: "csrEducationFocus.educationSpend", value: c.csrEducationFocus.educationSpend, isHighlighted: c.csrEducationFocus.doesEducation === true },
          { label: "Corporate Foundation?", path: "csrEducationFocus.isCorporateFoundation", value: c.csrEducationFocus.isCorporateFoundation, inputType: 'checkbox' },
          { label: "CSR Amount (INR Cr)", path: "csrEducationFocus.csrAmountINRcr", value: c.csrEducationFocus.csrAmountINRcr },
          { label: "Program Types", path: "csrEducationFocus.programType", value: c.csrEducationFocus.programType, inputType: 'string_array' },
          { label: "NGO Partners", path: "csrEducationFocus.currentNgoPartners", value: c.csrEducationFocus.currentNgoPartners, inputType: 'string_array' },
          { label: "CSR Committee Members", path: "csrEducationFocus.csrCommitteeMembers", value: c.csrEducationFocus.csrCommitteeMembers, inputType: 'object_array', objectSchema: defaultCsrMember }
        ];
         return <dl>
          {csrItems.map((item, index) => {
            const itemIsEditable = 'path' in item && !!item.path;
            let displayOrEditValue: React.ReactNode;

            if (itemIsEditable && item.inputType === 'string_array') {
                 displayOrEditValue = renderArrayOrNA(
                    item.value as string[] | null,
                    (val, idx, isEdit, itemPath, itemChangeCb) => isEdit && itemPath && itemChangeCb ?
                        <input type="text" value={val as string || ''} onChange={e => itemChangeCb(itemPath, e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} aria-label={`${item.label} item ${idx + 1}`}/>
                        : <li key={idx}>{val}</li>,
                    isDarkMode, isEditing, item.path, onFieldChange,
                    () => handleAddItem(item.path!, ""),
                    (basePath, itemIdx) => handleRemoveItem(basePath, itemIdx)
                );
            } else if (itemIsEditable && item.inputType === 'object_array' && item.path === "csrEducationFocus.csrCommitteeMembers") {
                 displayOrEditValue = renderArrayOrNA(
                    item.value as CSRCommitteeMember[] | null,
                    (mem: CSRCommitteeMember, idx, isEdit, itemPath, itemChangeCb) => {
                        if (isEdit && itemPath && itemChangeCb) {
                            return <div className={`p-2 my-1 rounded-md ${isDarkMode ? 'bg-neutral-700' : 'bg-neutral-100'} space-y-1`}>
                                <input placeholder="Name" value={mem.name || ''} onChange={e => handleObjectInArrayChange(item.path!, idx, 'name', e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} />
                                <input placeholder="Designation" value={mem.designation || ''} onChange={e => handleObjectInArrayChange(item.path!, idx, 'designation', e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} />
                                <input placeholder="Contact Info" value={mem.contactInfo || ''} onChange={e => handleObjectInArrayChange(item.path!, idx, 'contactInfo', e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} />
                                <input placeholder="LinkedIn URL" type="url" value={mem.linkedInProfileUrl || ''} onChange={e => handleObjectInArrayChange(item.path!, idx, 'linkedInProfileUrl', e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} />
                            </div>;
                        }
                        return <div key={idx} className={`p-4 my-2 rounded-lg ${isDarkMode ? 'bg-neutral-750 border border-neutral-700' : 'bg-neutral-100 border border-neutral-200'}`}>
                            <div className="flex flex-col">
                                <div>
                                    <p className={`text-md font-semibold ${isDarkMode ? 'text-neutral-100' : 'text-neutral-800'}`}>{mem.name || 'N/A'}</p>
                                    {(mem.designation && mem.designation !== "N/A") && 
                                        <p className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>{mem.designation}</p>
                                    }
                                </div>
                                {((mem.contactInfo && mem.contactInfo !== 'N/A') || (mem.linkedInProfileUrl && mem.linkedInProfileUrl !== 'N/A')) && 
                                    <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-neutral-700' : 'border-neutral-200'} text-xs space-y-2`}>
                                        {mem.contactInfo && mem.contactInfo !== 'N/A' && (
                                            <div className="flex items-start">
                                                <span className={`font-medium ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'} w-20 shrink-0`}>Contact:</span>
                                                <span className={`break-all ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>{mem.contactInfo}</span>
                                            </div>
                                        )}
                                        {mem.linkedInProfileUrl && mem.linkedInProfileUrl !== 'N/A' && (
                                             <div className="flex items-start">
                                                 <span className={`font-medium ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'} w-20 shrink-0`}>LinkedIn:</span>
                                                 <a href={mem.linkedInProfileUrl} target="_blank" rel="noopener noreferrer" className={`hover:underline break-all ${isDarkMode ? 'text-accent-400 hover:text-accent-500' : 'text-accent-500 hover:text-accent-600'}`}>{mem.linkedInProfileUrl}</a>
                                            </div>
                                        )}
                                    </div>
                                }
                            </div>
                        </div>;
                    },
                    isDarkMode, isEditing, item.path, onFieldChange,
                    () => handleAddItem(item.path!, (item as EditableDisplayConfig).objectSchema!()),
                    (basePath, itemIdx) => handleRemoveItem(basePath, itemIdx)
                );
            } else {
                displayOrEditValue = item.value as React.ReactNode;
            }

            return <DetailItem
              key={itemIsEditable ? item.path : item.label}
              label={item.label}
              value={displayOrEditValue} // This is now always ReactNode due to renderArrayOrNA or direct assignment
              isHighlighted={item.isHighlighted}
              isLast={index === csrItems.length -1}
              isEditing={itemIsEditable && isEditing}
              path={itemIsEditable ? item.path : undefined}
              onFieldChange={itemIsEditable ? onFieldChange : undefined}
              inputType={itemIsEditable ? item.inputType : undefined}
              originalValue={itemIsEditable ? item.value : undefined}
              objectSchema={itemIsEditable && item.inputType === 'object_array' ? (item as EditableDisplayConfig).objectSchema : undefined}
            />;
          })}
        </dl>;

      case "Budget":
        if (!isEditing && (!c.budgetInformation || c.budgetInformation.length === 0)) {
          return <DetailItem label="Budget Information" value={null} isLast />;
        }
        return (
          <div className="space-y-3">
            {renderArrayOrNA(
                c.budgetInformation,
                (item: BudgetItem, index, isEdit) => {
                    // const itemPathBase = `budgetInformation.${index}`; // Not directly used in DetailItem for this list
                    if (isEdit) {
                        return <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-neutral-750' : 'bg-neutral-100'} space-y-2`}>
                            <input placeholder="Year (e.g., 2023-24)" value={item.year || ''} onChange={e => handleObjectInArrayChange('budgetInformation', index, 'year', e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} />
                            <input placeholder="Total Budget" value={item.totalBudget || ''} onChange={e => handleObjectInArrayChange('budgetInformation', index, 'totalBudget', e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} />
                            <input placeholder="Education Budget" value={item.educationBudget || ''} onChange={e => handleObjectInArrayChange('budgetInformation', index, 'educationBudget', e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} />
                        </div>;
                    }
                    return <div key={index} className={`p-3.5 rounded-lg ${isDarkMode ? 'bg-neutral-750' : 'bg-neutral-100'}`}>
                              <h4 className={`font-semibold text-md mb-2 ${isDarkMode ? 'text-neutral-100' : 'text-neutral-800'}`}>{item.year}</h4>
                              <dl>
                                <DetailItem label="Total Budget" value={item.totalBudget} isLast={false} className={isDarkMode ? '!border-neutral-700/70' : '!border-neutral-200/70'}/>
                                <DetailItem label="Education Budget" value={item.educationBudget} isHighlighted={!!(item.educationBudget && item.educationBudget !== 'N/A')} isLast={true} />
                              </dl>
                           </div>;
                },
                isDarkMode, isEditing, "budgetInformation", onFieldChange,
                () => handleAddItem("budgetInformation", defaultBudgetItem()),
                (basePath, itemIdx) => handleRemoveItem(basePath, itemIdx)
            )}
          </div>
        );

      case "Contacts":
        const renderContactFields = (contact: ContactPerson | POC | null, basePath: string, title: string) => {
          if (!contact && !isEditing) return <DetailItem label={title} value={null} isLast={false} />; // isLast depends on context

          const currentContact = contact || defaultContactPerson();
          const fields: EditableDisplayConfig[] = [
            { label: "Name", path: `${basePath}.name`, value: currentContact.name },
            { label: "Designation", path: `${basePath}.designation`, value: currentContact.designation },
            { label: "Email", path: `${basePath}.email`, value: currentContact.email, inputType: 'url'},
            { label: "Phone", path: `${basePath}.phone`, value: currentContact.phone },
            { label: "Notes", path: `${basePath}.notes`, value: currentContact.notes, inputType: 'textarea' }
          ];
          if (isEditing) {
             if(!c.keyContacts.primaryDecisionMaker && basePath === "keyContacts.primaryDecisionMaker") onFieldChange(basePath, defaultContactPerson());
             if(!c.keyContacts.secondaryDecisionMaker && basePath === "keyContacts.secondaryDecisionMaker") onFieldChange(basePath, defaultContactPerson());
             if(!c.keyContacts.alternativeDecisionMaker && basePath === "keyContacts.alternativeDecisionMaker") onFieldChange(basePath, defaultContactPerson());
          }

          return (
            <div className={`p-3.5 my-2.5 rounded-lg ${isDarkMode ? 'bg-neutral-750' : 'bg-neutral-100'}`}>
              <h4 className={`font-semibold text-md mb-1 ${isDarkMode ? 'text-neutral-100' : 'text-neutral-800'}`}>{title}</h4>
              <dl>
                {fields.map((f, i) => <DetailItem
                                          key={f.path}
                                          label={f.label}
                                          value={f.value as React.ReactNode}
                                          path={f.path}
                                          inputType={f.inputType}
                                          originalValue={f.value}
                                          isEditing={isEditing}
                                          onFieldChange={onFieldChange}
                                          isLast={i === fields.length - 1}
                                          className={isDarkMode ? '!border-neutral-700/70' : '!border-neutral-200/70'}
                                        />)}
              </dl>
            </div>
          );
        };

        return (
          <div className="space-y-3">
            {renderContactFields(c.keyContacts.primaryDecisionMaker, "keyContacts.primaryDecisionMaker", "Primary Decision Maker")}
            {renderContactFields(c.keyContacts.secondaryDecisionMaker, "keyContacts.secondaryDecisionMaker", "Secondary Decision Maker")}
            {renderContactFields(c.keyContacts.alternativeDecisionMaker, "keyContacts.alternativeDecisionMaker", "Alternative Decision Maker")}

            <h3 className={`mt-5 mb-0 text-lg font-semibold ${isDarkMode ? 'text-neutral-100' : 'text-neutral-800'}`}>Points of Contact</h3>
            {renderArrayOrNA(
                c.pointsOfContact,
                (poc: POC, index, isEdit) => {
                    // const itemPathBase = `pointsOfContact.${index}`;
                     if (isEdit) {
                        return <div key={index} className={`p-3 my-1.5 rounded-lg ${isDarkMode ? 'bg-neutral-750' : 'bg-neutral-100'} space-y-2`}>
                                  <input placeholder="POC Name" value={poc.name || ''} onChange={e => handleObjectInArrayChange('pointsOfContact', index, 'name', e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} />
                                  <input placeholder="Designation" value={poc.designation || ''} onChange={e => handleObjectInArrayChange('pointsOfContact', index, 'designation', e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} />
                                  <input placeholder="Email" type="email" value={poc.email || ''} onChange={e => handleObjectInArrayChange('pointsOfContact', index, 'email', e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} />
                                  <input placeholder="Phone" value={poc.phone || ''} onChange={e => handleObjectInArrayChange('pointsOfContact', index, 'phone', e.target.value)} className={`${commonInputClass} ${getInputBorderClasses(isDarkMode)}`} />
                                  <textarea placeholder="Notes" value={poc.notes || ''} onChange={e => handleObjectInArrayChange('pointsOfContact', index, 'notes', e.target.value)} className={`${commonTextareaClass} ${getInputBorderClasses(isDarkMode)}`} rows={2}/>
                               </div>;
                    }
                    // View mode for POC
                    return <div key={index} className={`p-3.5 my-2.5 rounded-lg ${isDarkMode ? 'bg-neutral-750' : 'bg-neutral-100'}`}>
                              <h4 className={`font-semibold text-md mb-1 ${isDarkMode ? 'text-neutral-100' : 'text-neutral-800'}`}>{`POC ${poc.pocNumber || index + 1}`}</h4>
                              <dl>
                                <DetailItem label="Name" value={poc.name} isLast={false} />
                                <DetailItem label="Designation" value={poc.designation} isLast={false} />
                                <DetailItem label="Email" value={poc.email} isLast={false} />
                                <DetailItem label="Phone" value={poc.phone} isLast={false} />
                                <DetailItem label="Notes" value={poc.notes} isLast={true} />
                              </dl>
                           </div>;
                },
                isDarkMode, isEditing, "pointsOfContact", onFieldChange,
                () => handleAddItem("pointsOfContact", defaultPoc()),
                (basePath, itemIdx) => handleRemoveItem(basePath, itemIdx)
            )}
          </div>
        );

      case "Strategic":
        const strategicItems: EditableDisplayConfig[] = [
            { label: "Proposed Approach", path: "strategicOperationalInfo.proposedApproach", value: c.strategicOperationalInfo.proposedApproach, inputType: 'textarea' },
            { label: "Comments/Status", path: "strategicOperationalInfo.commentsStatus", value: c.strategicOperationalInfo.commentsStatus, inputType: 'textarea' },
            { label: "Week of Outreach", path: "strategicOperationalInfo.weekOfOutreach", value: c.strategicOperationalInfo.weekOfOutreach },
            { label: "Primary Location (Finance/Office)", path: "strategicOperationalInfo.primaryLocationFinanceOrOffice", value: c.strategicOperationalInfo.primaryLocationFinanceOrOffice },
            { label: "Other Info", path: "strategicOperationalInfo.otherInfo", value: c.strategicOperationalInfo.otherInfo, inputType: 'textarea' },
            { label: "Overall Notes", path: "strategicOperationalInfo.notesOverall", value: c.strategicOperationalInfo.notesOverall, inputType: 'textarea' }
        ];
        return <dl>{strategicItems.map((item, index) => <DetailItem
                                                              key={item.path}
                                                              label={item.label}
                                                              value={item.value as React.ReactNode}
                                                              path={item.path}
                                                              inputType={item.inputType}
                                                              originalValue={item.value}
                                                              isEditing={isEditing}
                                                              onFieldChange={onFieldChange}
                                                              isLast={index === strategicItems.length -1}/>)}</dl>;

      case "Sources":
         if (isEditing) {
            return <DetailItem
                      label="Sources (JSON)"
                      path="sources"
                      value={JSON.stringify(c.sources || [], null, 2)} // Display stringified JSON
                      inputType="json"
                      originalValue={c.sources || []} // Edit the actual array
                      isEditing={true}
                      onFieldChange={onFieldChange}
                      isLast={true} />;
         }
         return renderArrayOrNA(c.sources, (source: Source, i) => (
            <li key={i} className="py-1">
                <a href={source.uri} target="_blank" rel="noopener noreferrer" className={`hover:underline break-all ${isDarkMode ? 'text-accent-400 hover:text-accent-300' : 'text-accent-500 hover:text-accent-600'}`}>
                    {source.title && source.title !== 'N/A' ? source.title : source.uri}
                </a>
            </li>
         ), isDarkMode);
      default:
        return <p className={`p-4 ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>Select a tab to view details.</p>;
    }
  };

  return <div className={`p-4 sm:p-5 md:p-6 ${isDarkMode ? 'bg-neutral-800' : 'bg-white'} rounded-b-lg`}>{renderContent()}</div>;
};

export default CompanyDetailsDisplay;