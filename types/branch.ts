export interface RichTextContent {
  content: string;
}

export interface Contact {
  jobTitle: string;
  name?: string;
  phone?: string;
  email?: string;
  notes?: RichTextContent;
}

export interface Department {
  name: string;
  notes?: RichTextContent;
  contacts: Contact[];
  mondayHours?: string;
  tuesdayHours?: string;
  wednesdayHours?: string;
  thursdayHours?: string;
  fridayHours?: string;
  saturdayHours?: string;
  sundayHours?: string;
}

export interface Branch {
  id: string;
  branchId: string;
  branchName: string;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  fax?: string;
  toll?: string;
  itPhone?: string;
  timezone: string;
  departments: Department[];
}

// Form data uses strings for all fields since HTML inputs return strings
export interface BranchFormData {
  branchId: string;
  branchName: string;
  latitude: string;
  longitude: string;
  address: string;
  phone: string;
  fax?: string;
  toll?: string;
  itPhone?: string;
  timezone: string;
  departments: Department[];
}
