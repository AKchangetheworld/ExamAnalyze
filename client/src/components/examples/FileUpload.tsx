import FileUpload from '../FileUpload'

export default function FileUploadExample() {
  const handleFileSelect = (file: File) => {
    console.log('File selected:', file.name);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <FileUpload onFileSelect={handleFileSelect} />
    </div>
  );
}