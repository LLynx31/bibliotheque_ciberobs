export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "linear-gradient(135deg, hsl(214.3 100% 16.5%) 0%, hsl(211.8 100% 35.9%) 100%)" }}
    >
      {children}
    </div>
  );
}
