import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useState } from 'react';
import Button from '../ui/Button';
import InputField from '../ui/InputField';
import { validateHexKey } from '../../utils/validation';

export default function KeyField({ id, value, onChange, expectedHexLength, onGenerate, generating, showValidation }) {
  const [visible, setVisible] = useState(true);
  const length = value.replace(/\s+/g, '').length;
  const error = showValidation ? validateHexKey(value, expectedHexLength) : null;

  return (
    <div className="flex flex-col gap-2">
      <InputField
        id={id}
        label="Secret key (hex)"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        inputClassName="font-mono"
        placeholder={`${expectedHexLength} hexadecimal characters`}
        error={error}
        hint={`${expectedHexLength * 4}-bit key = ${expectedHexLength} hex characters. The same key is needed to decrypt.`}
        trailing={
          <span className={`text-xs tabular ${length === expectedHexLength ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-500'}`}>
            {length}/{expectedHexLength}
          </span>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={KeyRound} onClick={onGenerate} loading={generating}>
          Generate random key
        </Button>
        <Button variant="ghost" size="sm" icon={visible ? EyeOff : Eye} onClick={() => setVisible((current) => !current)}>
          {visible ? 'Hide key' : 'Show key'}
        </Button>
      </div>
    </div>
  );
}
