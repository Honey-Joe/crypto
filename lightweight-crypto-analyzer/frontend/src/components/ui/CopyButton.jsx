import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../hooks/useAppContext';
import Button from './Button';

export default function CopyButton({ value, label = 'Copy', size = 'sm' }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed', 'The browser blocked clipboard access. Select the text and copy it manually.');
    }
  }

  return (
    <Button variant="secondary" size={size} icon={copied ? Check : Copy} onClick={handleCopy} disabled={!value}>
      {copied ? 'Copied' : label}
    </Button>
  );
}
