// src/hooks/useTracking.js

const UTM_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign',
  'utm_content', 'utm_term', 'gclid', 'fbclid'
];

// Captura UTMs da URL e salva no sessionStorage
export function captureUtmParams() {
  const params = new URLSearchParams(window.location.search);

  UTM_PARAMS.forEach(param => {
    const value = params.get(param);
    if (value) {
      sessionStorage.setItem(param, value);
    }
  });

  // Gera session_id se não existir
  if (!sessionStorage.getItem('session_id')) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_id', sessionId);
  }

  // Incrementa contador de visitas
  const visitCount = parseInt(localStorage.getItem('visit_count') || '0', 10) + 1;
  localStorage.setItem('visit_count', visitCount.toString());
}

// Salva dados do formulário
export function saveFormData(data) {
  if (data.name) sessionStorage.setItem('name', data.name);
  if (data.email) sessionStorage.setItem('email', data.email);
  if (data.phone) sessionStorage.setItem('phone', data.phone);
}

/**
 * Detecta tipo de dispositivo
 */
export function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Captura TODOS os dados possíveis de tracking
 * @param {number} pageLoadTime - Timestamp de quando a página carregou
 * @param {number} modalOpenTime - Timestamp de quando o modal abriu
 */
export function getCaptureData(pageLoadTime = Date.now(), modalOpenTime = null) {
  const urlParams = new URLSearchParams(window.location.search);
  const now = Date.now();
  const currentDate = new Date();

  // Calcula tempo no site (em segundos)
  const timeOnSite = Math.round((now - pageLoadTime) / 1000);

  // Calcula tempo de preenchimento do formulário (em segundos)
  const formFillTime = modalOpenTime ? Math.round((now - modalOpenTime) / 1000) : 0;

  // Obtém dia da semana
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = daysOfWeek[currentDate.getDay()];

  // Obtém período do dia
  const hour = currentDate.getHours();
  let timeOfDay = 'morning'; // 6-12
  if (hour >= 12 && hour < 18) timeOfDay = 'afternoon'; // 12-18
  else if (hour >= 18 && hour < 24) timeOfDay = 'evening'; // 18-24
  else if (hour >= 0 && hour < 6) timeOfDay = 'night'; // 0-6

  return {
    // UTM Parameters
    utm_source: urlParams.get('utm_source') || sessionStorage.getItem('utm_source') || 'direct',
    utm_medium: urlParams.get('utm_medium') || sessionStorage.getItem('utm_medium') || 'direct',
    utm_campaign: urlParams.get('utm_campaign') || sessionStorage.getItem('utm_campaign') || 'none',
    utm_content: urlParams.get('utm_content') || sessionStorage.getItem('utm_content') || null,
    utm_term: urlParams.get('utm_term') || sessionStorage.getItem('utm_term') || null,

    // Parâmetros de Anúncios
    fbclid: urlParams.get('fbclid') || sessionStorage.getItem('fbclid') || null,
    gclid: urlParams.get('gclid') || sessionStorage.getItem('gclid') || null,

    // Localização e Navegação
    page_path: window.location.pathname,
    page_title: document.title,
    referrer: document.referrer || 'direct',
    page_url: window.location.href,

    // Dados do Dispositivo e Navegador
    device_type: getDeviceType(),
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    browser_language: navigator.language || navigator.userLanguage,
    user_agent: navigator.userAgent,

    // Dados de Tempo e Sessão
    session_timestamp: new Date().toISOString(),
    time_on_site_seconds: timeOnSite,
    form_fill_time_seconds: formFillTime,
    day_of_week: dayOfWeek,
    time_of_day: timeOfDay,
    hour_of_day: hour,
    session_id: sessionStorage.getItem('session_id'),
    visit_count: parseInt(localStorage.getItem('visit_count') || '1', 10),
    is_returning_visitor: parseInt(localStorage.getItem('visit_count') || '1', 10) > 1,
  };
}

// Constrói URL com todos os parâmetros
export function buildTrackedUrl(baseUrl) {
  if (!baseUrl) return null;

  try {
    const url = new URL(baseUrl);

    // Adiciona UTMs, IDs e dados do form
    [...UTM_PARAMS, 'session_id', 'name', 'email', 'phone'].forEach(key => {
      const value = sessionStorage.getItem(key);
      if (value && !url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  } catch (e) {
    console.error('Erro ao construir URL:', e);
    return baseUrl;
  }
}