import { useState } from 'react';
import { Province } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Station, StationFormData } from '@/types';

interface StationFormProps {
  station?: Station;
  onSubmit: (data: StationFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function StationForm({ station, onSubmit, isSubmitting }: StationFormProps) {
  const [formData, setFormData] = useState<StationFormData>({
    name: station?.name || '',
    description: station?.description || '',
    province: station?.province || Province.GAUTENG,
    contactNumber: station?.contactNumber || '',
    contactEmail: station?.contactEmail || '',
    website: station?.website || '',
    isActive: station?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (key: keyof StationFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="province" className="block text-sm font-medium text-gray-700">
          Province
        </label>
        <Select
          id="province"
          value={formData.province}
          onChange={(e) => handleChange('province', e.target.value)}
          required
        >
          {Object.values(Province).map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
          Contact Email
        </label>
        <Input
          id="contactEmail"
          type="email"
          value={formData.contactEmail}
          onChange={(e) => handleChange('contactEmail', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">
          Contact Number
        </label>
        <Input
          id="contactNumber"
          type="tel"
          value={formData.contactNumber}
          onChange={(e) => handleChange('contactNumber', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium text-gray-700">
          Website
        </label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => handleChange('website', e.target.value)}
        />
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Saving...' : station ? 'Update Station' : 'Create Station'}
        </Button>
      </div>
    </form>
  );
} 