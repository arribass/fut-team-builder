import "./globals.css";

export const metadata = {
  title: "FUT UNAV | Equilibrador de Equipos",
  description: "Genera equipos de fútbol equilibrados automáticamente para el grupo de fútbol de la UNAV.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
