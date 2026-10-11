import { FileJson, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../../hooks/useAppContext';
import { downloadCsv, downloadJson } from '../../utils/exportData';
import Button from '../ui/Button';

export default function ExportButtons({ results, json, prefix }) {
  const toast = useToast();

  function exportCsv() {
    downloadCsv(results, prefix);
    toast.success('CSV exported', `${results.length} result rows downloaded.`);
  }

  function exportJson() {
    downloadJson(json, prefix);
    toast.success('JSON exported');
  }

  return (
    <>
      <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={exportCsv} disabled={!results.length}>
        Export CSV
      </Button>
      <Button variant="secondary" size="sm" icon={FileJson} onClick={exportJson} disabled={!results.length}>
        Export JSON
      </Button>
    </>
  );
}
