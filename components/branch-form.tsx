import { useState, ChangeEvent } from 'react';
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BranchFormData, Department, Contact, RichTextContent } from '@/types/branch';
import { X } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";

// Rest of the file content remains exactly the same
interface BranchFormProps {
  initialData?: BranchFormData;
  onSubmit: (data: BranchFormData) => void;
  isEditing?: boolean;
}

export default function BranchForm({ initialData, onSubmit, isEditing = false }: BranchFormProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const emptyBranch: BranchFormData = {
    branchId: '',
    branchName: '',
    latitude: '',
    longitude: '',
    address: '',
    phone: '',
    fax: '',
    toll: '',
    itPhone: '',
    timezone: 'America/Toronto',
    departments: []
  };

  const [formData, setFormData] = useState<BranchFormData>(initialData || emptyBranch);
  const [departments, setDepartments] = useState<Department[]>(initialData?.departments || []);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Check user role
  const userRole = user?.publicMetadata?.role as string;
  const canEdit = userRole && !['employee', 'demo'].includes(userRole);

  if (!isUserLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Access Denied: </strong>
          <span>You do not have permission to {isEditing ? 'edit' : 'create'} branches.</span>
        </div>
      </div>
    );
  }

  const timezones = [
    { city: 'Vancouver', zone: 'America/Vancouver', label: 'Pacific Time' },
    { city: 'Edmonton', zone: 'America/Edmonton', label: 'Mountain Time' },
    { city: 'Regina', zone: 'America/Regina', label: 'Central Time (SK)' },
    { city: 'Winnipeg', zone: 'America/Winnipeg', label: 'Central Time' },
    { city: 'Toronto', zone: 'America/Toronto', label: 'Eastern Time' },
    { city: 'Halifax', zone: 'America/Halifax', label: 'Atlantic Time' },
    { city: "St. John's", zone: 'America/St_Johns', label: 'Newfoundland Time' }
  ];

  const validateCoordinates = (name: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return `${name} must be a valid number`;
    }
    if (name === 'latitude' && (num < -90 || num > 90)) {
      return 'Latitude must be between -90 and 90 degrees';
    }
    if (name === 'longitude' && (num < -180 || num > 180)) {
      return 'Longitude must be between -180 and 180 degrees';
    }
    return '';
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'latitude' || name === 'longitude') {
      const error = validateCoordinates(name, value);
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addDepartment = () => {
    setDepartments(prev => [...prev, {
      name: '',
      notes: { content: '' },
      contacts: [],
      mondayHours: '9:00 AM - 5:00 PM',
      tuesdayHours: '9:00 AM - 5:00 PM',
      wednesdayHours: '9:00 AM - 5:00 PM',
      thursdayHours: '9:00 AM - 5:00 PM',
      fridayHours: '9:00 AM - 5:00 PM',
      saturdayHours: 'Closed',
      sundayHours: 'Closed'
    }]);
  };

  const deleteDepartment = (index: number) => {
    setDepartments(prev => prev.filter((_, i) => i !== index));
  };

  const addContact = (departmentIndex: number) => {
    const newDepartments = [...departments];
    newDepartments[departmentIndex].contacts.push({
      jobTitle: '',
      phone: '',
      email: '',
      name: '',
      notes: { content: '' }
    });
    setDepartments(newDepartments);
  };

  const deleteContact = (deptIndex: number, contactIndex: number) => {
    const newDepartments = [...departments];
    newDepartments[deptIndex].contacts = newDepartments[deptIndex].contacts.filter((_, i) => i !== contactIndex);
    setDepartments(newDepartments);
  };

  const handleDepartmentChange = (index: number, field: keyof Department, value: string | RichTextContent) => {
    const newDepartments = [...departments];
    if (field === 'notes') {
      newDepartments[index] = {
        ...newDepartments[index],
        notes: { content: value as string }
      };
    } else {
      newDepartments[index] = {
        ...newDepartments[index],
        [field]: value
      };
    }
    setDepartments(newDepartments);
  };

  const handleContactChange = (deptIndex: number, contactIndex: number, field: keyof Contact, value: string | RichTextContent) => {
    const newDepartments = [...departments];
    if (field === 'notes') {
      newDepartments[deptIndex].contacts[contactIndex] = {
        ...newDepartments[deptIndex].contacts[contactIndex],
        notes: { content: value as string }
      };
    } else if (field === 'name') {
      const contact = newDepartments[deptIndex].contacts[contactIndex];
      contact.name = value as string;
      // Auto-generate email based on name
      if (value) {
        const nameParts = (value as string).split(' ');
        if (nameParts.length > 1) {
          const firstName = nameParts[0];
          const lastName = nameParts[nameParts.length - 1];
          contact.email = `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}@brandt.ca`;
        }
      }
    } else {
      newDepartments[deptIndex].contacts[contactIndex] = {
        ...newDepartments[deptIndex].contacts[contactIndex],
        [field]: value
      };
    }
    setDepartments(newDepartments);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const latError = validateCoordinates('latitude', formData.latitude);
    const lngError = validateCoordinates('longitude', formData.longitude);

    if (latError || lngError) {
      setErrors({
        ...(latError && { latitude: latError }),
        ...(lngError && { longitude: lngError })
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        ...formData,
        departments
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error: </strong>
          <span>{submitError}</span>
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Branch Information</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="branchId">Branch ID</Label>
            <FormInput
              id="branchId"
              name="branchId"
              value={formData.branchId}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="branchName">Branch Name</Label>
            <FormInput
              id="branchName"
              name="branchName"
              value={formData.branchName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border rounded-md"
            >
              {timezones.map(({ city, zone, label }) => (
                <option key={zone} value={zone}>
                  {`${city} (${label})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="latitude">Latitude (-90 to 90)</Label>
            <div className="space-y-1">
              <FormInput
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={handleInputChange}
                required
                className={errors.latitude ? "border-red-500" : ""}
              />
              {errors.latitude && (
                <p className="text-sm text-red-500">{errors.latitude}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="longitude">Longitude (-180 to 180)</Label>
            <div className="space-y-1">
              <FormInput
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={handleInputChange}
                required
                className={errors.longitude ? "border-red-500" : ""}
              />
              {errors.longitude && (
                <p className="text-sm text-red-500">{errors.longitude}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="address">Address</Label>
          <FormInput
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <FormInput
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="fax">Fax</Label>
            <FormInput
              id="fax"
              name="fax"
              value={formData.fax}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label htmlFor="toll">Toll</Label>
            <FormInput
              id="toll"
              name="toll"
              value={formData.toll}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label htmlFor="itPhone">IT Phone</Label>
            <FormInput
              id="itPhone"
              name="itPhone"
              value={formData.itPhone}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Departments</h2>
        {departments.map((dept, deptIndex) => (
          <div key={deptIndex} className="mb-6 p-4 border rounded relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={() => deleteDepartment(deptIndex)}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="mb-4">
              <Label>Department Name</Label>
              <FormInput
                value={dept.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleDepartmentChange(deptIndex, 'name', e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <Label>Notes</Label>
              <Textarea
                value={dept.notes?.content || ''}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleDepartmentChange(deptIndex, 'notes', e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="mb-4">
              <h3 className="font-bold mt-4 mb-2">Hours of Operation</h3>
              <div className="grid grid-cols-2 gap-4">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <div key={day}>
                    <Label>{day.charAt(0).toUpperCase() + day.slice(1)}</Label>
                    <FormInput
                      value={dept[`${day}Hours` as keyof Department] || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleDepartmentChange(deptIndex, `${day}Hours` as keyof Department, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <h3 className="font-bold mt-4 mb-2">Contacts</h3>
            {dept.contacts.map((contact, contactIndex) => (
              <div key={contactIndex} className="ml-4 mb-4 p-3 border rounded relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={() => deleteContact(deptIndex, contactIndex)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Job Title</Label>
                    <FormInput
                      value={contact.jobTitle}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleContactChange(deptIndex, contactIndex, 'jobTitle', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <FormInput
                      value={contact.name || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleContactChange(deptIndex, contactIndex, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <FormInput
                      value={contact.phone || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleContactChange(deptIndex, contactIndex, 'phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <FormInput
                      type="email"
                      value={contact.email || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleContactChange(deptIndex, contactIndex, 'email', e.target.value)}
                      readOnly
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={contact.notes?.content || ''}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleContactChange(deptIndex, contactIndex, 'notes', e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => addContact(deptIndex)}
              className="mt-2"
            >
              Add Contact
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={addDepartment}
          className="mt-4"
        >
          Add Department
        </Button>
      </Card>

      <Button 
        type="submit" 
        className="w-full"
        disabled={Object.keys(errors).length > 0 || isSubmitting}
      >
        {isSubmitting ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {isEditing ? 'Updating...' : 'Creating...'}
          </div>
        ) : (
          isEditing ? 'Update Branch' : 'Create Branch'
        )}
      </Button>
    </form>
  );
}
