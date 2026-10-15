import { Select, type SelectOption } from '@jtl/shared';
import { useUsers } from '../api/useUsers';

export interface UserSelectProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function UserSelect({
  label = 'Assignee',
  placeholder = 'Select a user...',
  disabled,
  ...props
}: UserSelectProps) {
  const { data: users, isLoading } = useUsers();

  const options: SelectOption[] = (users ?? []).map((u) => ({
    value: u.id,
    label: `@${u.username} (${u.id})`,
  }));

  return (
    <Select
      label={label}
      placeholder={isLoading ? 'Loading users...' : placeholder}
      options={options}
      {...props}
      // Placed after the spread so a caller-provided `disabled` can't clobber the loading state.
      disabled={isLoading || disabled}
    />
  );
}
