import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDropzone } from 'react-dropzone';
import { specsApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import { FileCode, Upload, Plus, ChevronDown, ChevronRight, Clock, X, CheckCircle2 } from 'lucide-react';

export function SpecsPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading } = useQuery('specs', () => specsApi.list());
  const specs = data?.specs ?? [];

  // Create spec modal
  const [showCreate, setShowCreate] = useState(false);
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecDesc, setNewSpecDesc] = useState('');

  // Upload version state
  const [versionLabel, setVersionLabel] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showUpload, setShowUpload] = useState<string | null>(null);
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);

  const createMutation = useMutation(
    () => specsApi.create(newSpecName, newSpecDesc),
    {
      onSuccess: () => {
        toast.success('API Spec created!');
        qc.invalidateQueries('specs');
        setShowCreate(false);
        setNewSpecName('');
        setNewSpecDesc('');
      },
      onError: () => {
        toast.error('Failed to create spec');
      },
    },
  );

  const uploadMutation = useMutation(
    async ({ specId, label, file }: { specId: string; label: string; file: File }) => {
      const fd = new FormData();
      fd.append('spec', file);
      fd.append('versionLabel', label);
      return specsApi.uploadVersion(specId, fd);
    },
    {
      onSuccess: () => {
        toast.success('Spec version uploaded and validated!');
        qc.invalidateQueries('specs');
        setShowUpload(null);
        setVersionLabel('');
        setUploadFile(null);
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
          'Upload failed. Ensure the file is valid OpenAPI 3.x.';
        toast.error(msg);
      },
    },
  );

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) setUploadFile(files[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'], 'text/yaml': ['.yaml', '.yml'] },
    maxFiles: 1,
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/10">
              Repository
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OpenAPI Specifications</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Authoritative contracts, versions, and schema snapshot archives
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>New Spec</span>
          </button>
        )}
      </div>

      {/* Create spec modal */}
      {showCreate && (
        <Modal title="Register New API Specification" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <FormField label="Specification Name" required>
              <input
                className="input text-xs"
                value={newSpecName}
                onChange={(e) => setNewSpecName(e.target.value)}
                placeholder="User Service API"
                autoFocus
              />
            </FormField>
            <FormField label="Description">
              <input
                className="input text-xs"
                value={newSpecDesc}
                onChange={(e) => setNewSpecDesc(e.target.value)}
                placeholder="Core authentication and user profile microservice"
              />
            </FormField>
            <div className="flex gap-2.5 pt-2">
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary flex-1 text-xs">
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!newSpecName || createMutation.isLoading}
                className="btn btn-primary flex-1 text-xs"
              >
                {createMutation.isLoading ? 'Registering...' : 'Register Spec'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Specs list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : specs.length === 0 ? (
        <EmptyState
          icon={<FileCode className="w-8 h-8 text-zinc-600" />}
          title="No specifications registered"
          desc={
            isAdmin
              ? 'Register your first OpenAPI contract to begin detecting breaking changes.'
              : 'No OpenAPI specifications exist in the registry.'
          }
          action={
            isAdmin ? (
              <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs">
                Register Specification
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          {specs.map((spec: Record<string, string>) => (
            <div key={spec.id} className="glass-card bg-[#0b0b0d] border border-white/10 overflow-hidden">
              <div
                className="p-4 px-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedSpec(expandedSpec === spec.id ? null : spec.id)}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/15 flex items-center justify-center flex-shrink-0 text-white">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-xs tracking-tight truncate">{spec.name}</p>
                      <span className="font-mono text-[10px] text-zinc-500 uppercase px-1.5 py-0.2 rounded border border-white/5 bg-zinc-900">
                        OpenAPI 3.x
                      </span>
                    </div>
                    {spec.description && (
                      <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{spec.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUpload(showUpload === spec.id ? null : spec.id);
                        setExpandedSpec(spec.id);
                      }}
                      className="btn btn-secondary text-xs py-1 px-2.5"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Version</span>
                    </button>
                  )}
                  <button className="text-zinc-500 hover:text-white transition-colors">
                    {expandedSpec === spec.id ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Upload version form */}
              {showUpload === spec.id && (
                <div className="p-5 border-t border-white/10 bg-black/50">
                  <div className="max-w-xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
                        Upload Contract Snapshot for {spec.name}
                      </h3>
                      <button
                        onClick={() => setShowUpload(null)}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Semantic Version Label <span className="text-rose-400">*</span>
                      </label>
                      <input
                        className="input text-xs font-mono"
                        value={versionLabel}
                        onChange={(e) => setVersionLabel(e.target.value)}
                        placeholder="e.g. 2.1.0"
                      />
                    </div>

                    <div
                      {...getRootProps()}
                      className={`border border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                        isDragActive
                          ? 'border-white bg-white/5'
                          : 'border-white/20 hover:border-white/40 bg-zinc-950'
                      }`}
                    >
                      <input {...getInputProps()} />
                      {uploadFile ? (
                        <div className="flex items-center justify-center gap-2 text-xs font-mono text-white">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="font-semibold">{uploadFile.name}</span>
                          <span className="text-zinc-500">
                            ({(uploadFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
                          <p className="text-xs text-zinc-300 font-medium">
                            Drag & drop OpenAPI file or <span className="underline text-white">browse</span>
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-1">Supports JSON or YAML (Max 5 MB)</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        onClick={() => setShowUpload(null)}
                        className="btn btn-secondary flex-1 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!versionLabel || !uploadFile) return;
                          uploadMutation.mutate({ specId: spec.id, label: versionLabel, file: uploadFile });
                        }}
                        disabled={!versionLabel || !uploadFile || uploadMutation.isLoading}
                        className="btn btn-primary flex-1 text-xs"
                      >
                        {uploadMutation.isLoading ? 'Validating Contract...' : 'Upload & Validate'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Versions list */}
              {expandedSpec === spec.id && <SpecVersionsList specId={spec.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SpecVersionsList({ specId }: { specId: string }) {
  const { data, isLoading } = useQuery(['versions', specId], () => specsApi.listVersions(specId));
  const versions = data?.versions ?? [];

  return (
    <div className="border-t border-white/10 bg-black/30">
      <div className="px-5 py-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider border-b border-white/5">
        Version History & Snapshots ({versions.length})
      </div>
      {isLoading ? (
        <div className="p-4">
          <div className="skeleton h-8 rounded" />
        </div>
      ) : versions.length === 0 ? (
        <p className="text-xs text-zinc-500 p-4 font-mono">No versions uploaded yet</p>
      ) : (
        <div className="divide-y divide-white/5 font-mono text-xs">
          {versions.map((v: Record<string, string | number>) => (
            <div key={v.id} className="px-5 py-2.5 flex items-center justify-between hover:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white px-2 py-0.5 rounded bg-zinc-900 border border-white/15">
                  v{v.versionLabel}
                </span>
                <span className="text-zinc-500 text-[11px]">
                  {v.file_size ? `${(Number(v.file_size) / 1024).toFixed(1)} KB` : 'JSON schema'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Clock className="w-3 h-3" />
                <span>{new Date(v.uploadedAt as string).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-md p-6 bg-[#0c0c0e] border border-white/15 shadow-modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white tracking-tight">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-card p-12 text-center bg-[#09090b] border border-white/10">
      <div className="flex justify-center mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5">{desc}</p>
      {action}
    </div>
  );
}
