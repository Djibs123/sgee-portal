type BreadcrumbProps = {
  label: string;
};

export function Breadcrumb({ label }: BreadcrumbProps) {
  return (
    <div className="breadcrumb">
      SGEE{' '}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18l6-6-6-6" />
      </svg>{' '}
      <span>{label}</span>
    </div>
  );
}
