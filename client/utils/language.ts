export const translations: Record<string, Record<string, string>> = {
  Español: {
    // Navbar / global
    "Tools": "Herramientas",
    "How it works": "Cómo funciona",
    "Blog": "Blog",
    "About": "Acerca de",
    "Sign In": "Iniciar sesión",
    "Get Started": "Comenzar",
    "Explore Tools": "Explorar herramientas",
    "AI Chat (Coming Soon)": "Chat de IA (Próximamente)",
    "Files Processed": "Archivos procesados",
    "Active Users": "Usuarios activos",
    "Tools Available": "Herramientas disponibles",
    "Uptime": "Disponibilidad",
    "Empower Your Workflow": "Impulsa tu flujo de trabajo",
    "Everything you need to manage your documents in one place.": "Todo lo que necesitas para gestionar tus documentos en un solo lugar.",
    "All Tools": "Todas las herramientas",
    "AI Power": "Potencia de IA",
    "PDF Essentials": "PDF esenciales",
    "Converters": "Convertidores",
    "How It Works": "Cómo funciona",
    "Simple, secure, and streamlined process.": "Proceso sencillo, seguro y optimizado.",
    "Upload Files": "Sube archivos",
    "Drag and drop your files directly into our secure tool interface. We support all major formats.": "Arrastra y suelta tus archivos directamente en nuestra interfaz segura. Compatibles con todos los formatos principales.",
    "Process": "Procesa",
    "Our servers instantly process your documents. For AI tools, advanced models analyze your content.": "Nuestros servidores procesan tus documentos al instante. Para herramientas de IA, modelos avanzados analizan tu contenido.",
    "Download": "Descarga",
    "Get your converted files immediately. All files are automatically deleted from our servers after 1 hour.": "Obtén tus archivos convertidos al instante. Todos los archivos se eliminan automáticamente de nuestros servidores después de 1 hora.",
    "Document Tools": "Herramientas de documentos",
    "Reimagined.": "Reimaginadas.",
    "The all-in-one platform for your PDFs, images, and documents.\n              Secure, fast, and completely free forever.": "La plataforma todo en uno para tus PDF, imágenes y documentos.\n              Segura, rápida y completamente gratuita para siempre.",
    "Thundocs": "Thundocs",
    "Tools Section Title": "Empower Your Workflow",
    "Tools Section Subtitle": "Everything you need to manage your documents in one place.",
    "Company": "Compañía",
    "Merge PDF": "Combinar PDF",
    "Compress PDF": "Comprimir PDF",
    "PDF to Word": "PDF a Word",
    "Privacy Policy": "Política de privacidad",
    "Terms of Service": "Términos de servicio",
    "About Us": "Sobre nosotros",
    "Made with ♥ for productivity": "Hecho con ♥ para la productividad",
  },
};

export const getCurrentLanguage = () => {
  if (typeof window === "undefined") return "English";
  return window.localStorage.getItem("thundocs:selectedLang") || "English";
};

export const t = (text: string): string => {
  const lang = getCurrentLanguage();
  const table = translations[lang];
  if (!table) return text;
  return table[text] || text;
};
