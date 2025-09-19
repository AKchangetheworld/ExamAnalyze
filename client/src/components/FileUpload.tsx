import { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface FileUploadProps {
  onFileSelect: (file: File, previewUrl: string) => void;
  isProcessing?: boolean;
  className?: string;
}

export default function FileUpload({ onFileSelect, isProcessing = false, className = "" }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Validate file type with robust checking (same as onChange)
      const isPdfByMime = ['application/pdf', 'application/x-pdf', 'application/acrobat'].includes(file.type);
      const isPdfByExtension = file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/');
      
      if (isImage || isPdfByMime || isPdfByExtension) {
        setSelectedFile(file);
        const previewUrl = URL.createObjectURL(file);
        onFileSelect(file, previewUrl);
      } else {
        console.warn('Unsupported file type in drag/drop:', file.type, 'File name:', file.name);
      }
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type with robust checking
      const isPdfByMime = ['application/pdf', 'application/x-pdf', 'application/acrobat'].includes(file.type);
      const isPdfByExtension = file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/');
      
      if (isImage || isPdfByMime || isPdfByExtension) {
        setSelectedFile(file);
        const previewUrl = URL.createObjectURL(file);
        onFileSelect(file, previewUrl);
      } else {
        // Reset the input and show error
        e.target.value = '';
        console.warn('Unsupported file type:', file.type, 'File name:', file.name);
      }
    }
  }, [onFileSelect]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  if (selectedFile) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-chart-1" />
            <div>
              <p className="font-medium text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
          {!isProcessing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={removeFile}
              data-testid="button-remove-file"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive ? 'border-primary bg-accent/50' : 'border-border'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover-elevate'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isProcessing && document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept="image/*,.pdf,application/pdf,application/x-pdf,application/acrobat"
          onChange={handleChange}
          disabled={isProcessing}
          data-testid="input-file-upload"
        />
        
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">上传试卷</h3>
        <p className="text-sm text-muted-foreground mb-4">
          拖拽试卷图片或PDF文件到这里，或点击选择文件
        </p>
        <p className="text-xs text-muted-foreground">
          支持 JPG、PNG、PDF 格式，文件大小不超过 10MB
        </p>
      </div>
    </Card>
  );
}