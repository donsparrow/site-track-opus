import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  url: string | null;
  tipo: string;
  onClose: () => void;
}

export default function PreviewDialog({ url, tipo, onClose }: Props) {
  return (
    <Dialog open={!!url} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Visualização</DialogTitle>
        </DialogHeader>
        {tipo === 'imagem' && url && (
          <img src={url} alt="Preview" className="w-full rounded-lg" />
        )}
        {tipo === 'pdf' && url && (
          <iframe src={url} className="w-full h-[70vh] rounded-lg" title="PDF Preview" />
        )}
      </DialogContent>
    </Dialog>
  );
}
