import "./globals.css";

export const metadata = {
  title: "Fut Team Balancer | Equipos Equilibrados",
  description: "Genera equipos de fútbol equilibrados automáticamente a partir de una lista de nombres. La solución perfecta para tus partidos de fútbol.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
