export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ backgroundColor: 'transparent' }}>
      {children}
    </div>
  );
}

