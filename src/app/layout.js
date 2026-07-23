import "./globals.css";

export const metadata = {
  title: "FUT Builder | Equilibrador de Equipos",
  description: "Genera equipos de fútbol equilibrados automáticamente.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
