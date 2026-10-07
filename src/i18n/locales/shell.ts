import type { LocaleModule } from '../index';

/** Estrutura do app: layouts, barra superior/lateral/inferior, paleta de comandos, componentes de UI, tutorial e "Seja Pro". */
export default {
  en: {
    // App / layouts
    Carregando: 'Loading',
    'Carregando…': 'Loading…',
    'Pular para o conteúdo': 'Skip to content',
    'Você está offline — exibindo dados salvos neste dispositivo.': 'You’re offline — showing data saved on this device.',
    'Nexora — página inicial': 'Nexora — home page',
    Privacidade: 'Privacy',
    Termos: 'Terms',
    'Patrimônio líquido': 'Net worth',
    Entradas: 'Income',
    Saídas: 'Expenses',
    Economia: 'Savings',
    'Inteligência financeira em um só lugar.': 'Financial intelligence in one place.',
    'Inteligência financeira em um só lugar': 'Financial intelligence in one place',
    'Dados protegidos e controle total sobre eles (LGPD)': 'Protected data and full control over it (LGPD)',
    'Insights automáticos baseados nos seus números': 'Automatic insights based on your numbers',
    'Sessões seguras e gerenciamento de dispositivos': 'Secure sessions and device management',

    // Barra inferior
    Início: 'Home',
    Transações: 'Transactions',
    Análises: 'Analytics',
    Receita: 'Income',
    Despesa: 'Expense',
    Transferência: 'Transfer',
    Adicionar: 'Add',
    'Navegação inferior': 'Bottom navigation',
    'Fechar menu de adição': 'Close add menu',
    'Adicionar transação': 'Add transaction',

    // Paleta de comandos
    Ações: 'Actions',
    'Nova despesa': 'New expense',
    'Nova receita': 'New income',
    'Nova transferência': 'New transfer',
    'gasto adicionar': 'expense spending add',
    'ganho entrada adicionar': 'income earning add',
    'mover pix': 'move transfer',
    Navegar: 'Go to',
    Preferências: 'Preferences',
    'Tema escuro': 'Dark theme',
    'Tema claro': 'Light theme',
    'Ocultar/mostrar valores': 'Hide/show amounts',
    privacidade: 'privacy',
    'Sair da conta': 'Sign out',
    'Paleta de comandos': 'Command palette',
    'Digite um comando ou busque transações…': 'Type a command or search transactions…',
    'Nenhum resultado para “{query}”.': 'No results for “{query}”.',

    // Faixa de demonstração
    'Modo demonstração': 'Demo mode',
    'dados fictícios para você explorar a Nexora.': 'sample data for you to explore Nexora.',
    'Criar minha conta': 'Create my account',

    // Instalar app
    'Instalar aplicativo': 'Install app',
    'Instale a Nexora': 'Install Nexora',
    'Toque em': 'Tap',
    Compartilhar: 'Share',
    'e depois em “Adicionar à Tela de Início”.': 'and then “Add to Home Screen”.',
    'Acesso rápido, offline básico e notificações.': 'Quick access, basic offline mode and notifications.',
    Instalar: 'Install',
    Dispensar: 'Dismiss',

    // Barra lateral
    'Navegação principal': 'Main navigation',
    Conta: 'Account',
    'Pergunte sobre seus gastos, metas e saldo.': 'Ask about your spending, goals and balance.',
    'Expandir menu': 'Expand menu',
    'Recolher menu': 'Collapse menu',
    Recolher: 'Collapse',

    // Sincronização
    'Sincronizando com a nuvem…': 'Syncing with the cloud…',
    'Tudo salvo na nuvem': 'Everything saved to the cloud',
    'Sem internet — suas alterações ficam no aparelho e sobem quando voltar a conexão':
      'No internet — your changes stay on this device and upload when you’re back online',
    'Não foi possível salvar na nuvem agora. Tentaremos de novo automaticamente.':
      'Couldn’t save to the cloud right now. We’ll try again automatically.',

    // Tema
    Tema: 'Theme',
    'Alterar tema': 'Change theme',
    Escuro: 'Dark',
    Claro: 'Light',
    Sistema: 'System',

    // Barra superior
    'Nexora — início': 'Nexora — home',
    'Abrir busca e comandos': 'Open search and commands',
    'Buscar ou executar comando…': 'Search or run a command…',
    Buscar: 'Search',
    'Mostrar valores': 'Show amounts',
    'Ocultar valores': 'Hide amounts',
    'Notificações, {n} não lidas': 'Notifications, {n} unread',
    Notificações: 'Notifications',
    'Nova transação': 'New transaction',
    'Menu da conta': 'Account menu',
    Perfil: 'Profile',
    Configurações: 'Settings',
    Segurança: 'Security',
    Sair: 'Sign out',

    // Componentes de UI
    'Sem base de comparação': 'No baseline to compare',
    'p.p.': 'pp',
    'vs. anterior': 'vs. previous',
    'Algo deu errado': 'Something went wrong',
    'Não foi possível carregar estas informações. Tente novamente.': 'We couldn’t load this information. Please try again.',
    'Tentar novamente': 'Try again',
    'Você está offline': 'You’re offline',
    'Mostrando os dados salvos neste dispositivo. As alterações serão mantidas localmente.':
      'Showing data saved on this device. Your changes will be kept locally.',
    'Fechar notificação': 'Close notification',

    // Tutorial
    Tutorial: 'Tutorial',
    '{n} de {total}': '{n} of {total}',
    'Pular tutorial': 'Skip tutorial',
    'Não mostrar mais tutoriais': 'Don’t show tutorials again',
    Pular: 'Skip',
    Concluir: 'Done',
    Próximo: 'Next',
    'Ver tutorial: {nome}': 'View tutorial: {nome}',
    'Como usar': 'How to use',

    // Seja Pro
    'Desbloqueie a Nexora Pro': 'Unlock Nexora Pro',
    'Agora não': 'Not now',
    'Ver planos': 'See plans',
    '/mês': '/month',
    'ou {preco}/ano · cancele quando quiser': 'or {preco}/year · cancel anytime',
    '{feature} faz parte do plano Pro.': '{feature} is part of the Pro plan.',
    'O plano Grátis inclui até {n} contas. Seja Pro para adicionar quantas quiser.':
      'The Free plan includes up to {n} accounts. Go Pro to add as many as you want.',
    'O plano Grátis inclui até {n} cartões. Seja Pro para adicionar quantos quiser.':
      'The Free plan includes up to {n} cards. Go Pro to add as many as you want.',
    'O plano Grátis inclui até {n} metas. Seja Pro para adicionar quantas quiser.':
      'The Free plan includes up to {n} goals. Go Pro to add as many as you want.',
    'O plano Grátis inclui até {n} orçamentos. Seja Pro para adicionar quantos quiser.':
      'The Free plan includes up to {n} budgets. Go Pro to add as many as you want.',
    'Tudo do plano Grátis': 'Everything in the Free plan',
    'Contas, cartões, metas e orçamentos ilimitados': 'Unlimited accounts, cards, goals and budgets',
    'Relatórios em PDF e Excel': 'PDF and Excel reports',
    'Suporte prioritário pelo WhatsApp': 'Priority support via WhatsApp',
    'Acesso antecipado às novidades': 'Early access to new features',
  },
  es: {
    // App / layouts
    Carregando: 'Cargando',
    'Carregando…': 'Cargando…',
    'Pular para o conteúdo': 'Saltar al contenido',
    'Você está offline — exibindo dados salvos neste dispositivo.': 'Estás sin conexión: mostrando los datos guardados en este dispositivo.',
    'Nexora — página inicial': 'Nexora — página de inicio',
    Privacidade: 'Privacidad',
    Termos: 'Términos',
    'Patrimônio líquido': 'Patrimonio neto',
    Entradas: 'Ingresos',
    Saídas: 'Gastos',
    Economia: 'Ahorro',
    'Inteligência financeira em um só lugar.': 'Inteligencia financiera en un solo lugar.',
    'Inteligência financeira em um só lugar': 'Inteligencia financiera en un solo lugar',
    'Dados protegidos e controle total sobre eles (LGPD)': 'Datos protegidos y control total sobre ellos (LGPD)',
    'Insights automáticos baseados nos seus números': 'Insights automáticos basados en tus números',
    'Sessões seguras e gerenciamento de dispositivos': 'Sesiones seguras y gestión de dispositivos',

    // Barra inferior
    Início: 'Inicio',
    Transações: 'Transacciones',
    Análises: 'Análisis',
    Receita: 'Ingreso',
    Despesa: 'Gasto',
    Transferência: 'Transferencia',
    Adicionar: 'Agregar',
    'Navegação inferior': 'Navegación inferior',
    'Fechar menu de adição': 'Cerrar menú de agregar',
    'Adicionar transação': 'Agregar transacción',

    // Paleta de comandos
    Ações: 'Acciones',
    'Nova despesa': 'Nuevo gasto',
    'Nova receita': 'Nuevo ingreso',
    'Nova transferência': 'Nueva transferencia',
    'gasto adicionar': 'gasto agregar',
    'ganho entrada adicionar': 'ingreso ganancia agregar',
    'mover pix': 'mover transferir',
    Navegar: 'Ir a',
    Preferências: 'Preferencias',
    'Tema escuro': 'Tema oscuro',
    'Tema claro': 'Tema claro',
    'Ocultar/mostrar valores': 'Ocultar/mostrar montos',
    privacidade: 'privacidad',
    'Sair da conta': 'Cerrar sesión',
    'Paleta de comandos': 'Paleta de comandos',
    'Digite um comando ou busque transações…': 'Escribe un comando o busca transacciones…',
    'Nenhum resultado para “{query}”.': 'No hay resultados para “{query}”.',

    // Faixa de demonstração
    'Modo demonstração': 'Modo demostración',
    'dados fictícios para você explorar a Nexora.': 'datos ficticios para que explores Nexora.',
    'Criar minha conta': 'Crear mi cuenta',

    // Instalar app
    'Instalar aplicativo': 'Instalar aplicación',
    'Instale a Nexora': 'Instala Nexora',
    'Toque em': 'Toca',
    Compartilhar: 'Compartir',
    'e depois em “Adicionar à Tela de Início”.': 'y luego “Agregar a inicio”.',
    'Acesso rápido, offline básico e notificações.': 'Acceso rápido, modo sin conexión básico y notificaciones.',
    Instalar: 'Instalar',
    Dispensar: 'Descartar',

    // Barra lateral
    'Navegação principal': 'Navegación principal',
    Conta: 'Cuenta',
    'Pergunte sobre seus gastos, metas e saldo.': 'Pregunta sobre tus gastos, metas y saldo.',
    'Expandir menu': 'Expandir menú',
    'Recolher menu': 'Contraer menú',
    Recolher: 'Contraer',

    // Sincronização
    'Sincronizando com a nuvem…': 'Sincronizando con la nube…',
    'Tudo salvo na nuvem': 'Todo guardado en la nube',
    'Sem internet — suas alterações ficam no aparelho e sobem quando voltar a conexão':
      'Sin internet: tus cambios quedan en el dispositivo y se suben cuando vuelva la conexión',
    'Não foi possível salvar na nuvem agora. Tentaremos de novo automaticamente.':
      'No se pudo guardar en la nube ahora. Lo intentaremos de nuevo automáticamente.',

    // Tema
    Tema: 'Tema',
    'Alterar tema': 'Cambiar tema',
    Escuro: 'Oscuro',
    Claro: 'Claro',
    Sistema: 'Sistema',

    // Barra superior
    'Nexora — início': 'Nexora — inicio',
    'Abrir busca e comandos': 'Abrir búsqueda y comandos',
    'Buscar ou executar comando…': 'Busca o ejecuta un comando…',
    Buscar: 'Buscar',
    'Mostrar valores': 'Mostrar montos',
    'Ocultar valores': 'Ocultar montos',
    'Notificações, {n} não lidas': 'Notificaciones, {n} sin leer',
    Notificações: 'Notificaciones',
    'Nova transação': 'Nueva transacción',
    'Menu da conta': 'Menú de la cuenta',
    Perfil: 'Perfil',
    Configurações: 'Configuración',
    Segurança: 'Seguridad',
    Sair: 'Cerrar sesión',

    // Componentes de UI
    'Sem base de comparação': 'Sin base de comparación',
    'p.p.': 'p.p.',
    'vs. anterior': 'vs. anterior',
    'Algo deu errado': 'Algo salió mal',
    'Não foi possível carregar estas informações. Tente novamente.': 'No se pudo cargar esta información. Inténtalo de nuevo.',
    'Tentar novamente': 'Reintentar',
    'Você está offline': 'Estás sin conexión',
    'Mostrando os dados salvos neste dispositivo. As alterações serão mantidas localmente.':
      'Mostrando los datos guardados en este dispositivo. Los cambios se mantendrán localmente.',
    'Fechar notificação': 'Cerrar notificación',

    // Tutorial
    Tutorial: 'Tutorial',
    '{n} de {total}': '{n} de {total}',
    'Pular tutorial': 'Saltar tutorial',
    'Não mostrar mais tutoriais': 'No mostrar más tutoriales',
    Pular: 'Saltar',
    Concluir: 'Listo',
    Próximo: 'Siguiente',
    'Ver tutorial: {nome}': 'Ver tutorial: {nome}',
    'Como usar': 'Cómo usar',

    // Seja Pro
    'Desbloqueie a Nexora Pro': 'Desbloquea Nexora Pro',
    'Agora não': 'Ahora no',
    'Ver planos': 'Ver planes',
    '/mês': '/mes',
    'ou {preco}/ano · cancele quando quiser': 'o {preco}/año · cancela cuando quieras',
    '{feature} faz parte do plano Pro.': '{feature} forma parte del plan Pro.',
    'O plano Grátis inclui até {n} contas. Seja Pro para adicionar quantas quiser.':
      'El plan Gratis incluye hasta {n} cuentas. Hazte Pro para agregar todas las que quieras.',
    'O plano Grátis inclui até {n} cartões. Seja Pro para adicionar quantos quiser.':
      'El plan Gratis incluye hasta {n} tarjetas. Hazte Pro para agregar todas las que quieras.',
    'O plano Grátis inclui até {n} metas. Seja Pro para adicionar quantas quiser.':
      'El plan Gratis incluye hasta {n} metas. Hazte Pro para agregar todas las que quieras.',
    'O plano Grátis inclui até {n} orçamentos. Seja Pro para adicionar quantos quiser.':
      'El plan Gratis incluye hasta {n} presupuestos. Hazte Pro para agregar todos los que quieras.',
    'Tudo do plano Grátis': 'Todo lo del plan Gratis',
    'Contas, cartões, metas e orçamentos ilimitados': 'Cuentas, tarjetas, metas y presupuestos ilimitados',
    'Relatórios em PDF e Excel': 'Reportes en PDF y Excel',
    'Suporte prioritário pelo WhatsApp': 'Soporte prioritario por WhatsApp',
    'Acesso antecipado às novidades': 'Acceso anticipado a las novedades',
  },
} satisfies LocaleModule;
