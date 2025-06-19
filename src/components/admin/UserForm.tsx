'use client';

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { InputGroup } from '@/components/ui/input';
import { StaffRole, UserType } from '@prisma/client';

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().optional(),
  userType: z.nativeEnum(UserType),
  staffRole: z.nativeEnum(StaffRole).optional(),
  stationId: z.string().optional(),
  isActive: z.boolean(),
  password: z.string().min(8).optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: UserFormData;
  onSubmit: (data: UserFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function UserForm({ user, onSubmit, isSubmitting }: UserFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: user?.email || '',
      name: user?.name || '',
      phone: user?.phone || undefined,
      userType: user?.userType || UserType.STAFF,
      staffRole: user?.staffRole || undefined,
      stationId: user?.stationId || undefined,
      isActive: user?.isActive ?? true,
    },
  });

  const userType = watch('userType');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <InputGroup>
        <Input
          type="email"
          placeholder="Email"
          {...register('email')}
          data-invalid={!!errors.email}
        />
      </InputGroup>

      {!user && (
        <InputGroup>
          <Input
            type="password"
            placeholder="Password"
            {...register('password')}
            data-invalid={!!errors.password}
          />
        </InputGroup>
      )}

      <InputGroup>
        <Input
          type="text"
          placeholder="Full Name"
          {...register('name')}
          data-invalid={!!errors.name}
        />
      </InputGroup>

      <InputGroup>
        <Input
          type="tel"
          placeholder="Phone Number"
          {...register('phone')}
          data-invalid={!!errors.phone}
        />
      </InputGroup>

      <InputGroup>
        <Select {...register('userType')} data-invalid={!!errors.userType}>
          <option value={UserType.STAFF}>Staff</option>
          <option value={UserType.RADIO}>Radio Station</option>
        </Select>
      </InputGroup>

      {userType === UserType.STAFF && (
        <InputGroup>
          <Select {...register('staffRole')} data-invalid={!!errors.staffRole}>
            <option value={StaffRole.SUPERADMIN}>Super Admin</option>
            <option value={StaffRole.ADMIN}>Admin</option>
            <option value={StaffRole.EDITOR}>Editor</option>
            <option value={StaffRole.SUB_EDITOR}>Sub Editor</option>
            <option value={StaffRole.JOURNALIST}>Journalist</option>
            <option value={StaffRole.INTERN}>Intern</option>
          </Select>
        </InputGroup>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Active</span>
        <Switch
          checked={watch('isActive')}
          onChange={(checked) => {
            setValue('isActive', checked);
          }}
          color="green"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} color="primary">
          {user ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
} 