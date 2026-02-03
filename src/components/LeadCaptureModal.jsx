import React, { useState, useEffect, useRef } from 'react';
import { X, User, Mail, Phone, Send, Heart, Award, AlertCircle } from 'lucide-react';
import { useGoogleSheetsCheckout } from '../hooks/useGoogleSheetsCheckout';
import { saveFormData, buildTrackedUrl, getCaptureData } from '../hooks/useTracking';
import { useFormTracking } from '../hooks/useFormTracking';

const LeadCaptureModal = ({ isOpen, onClose, source = 'CTA' }) => {
  // Busca a URL de checkout da planilha
  const { checkoutUrl, loading: checkoutLoading } = useGoogleSheetsCheckout();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    graduationTime: '',
    source: source
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [countdown, setCountdown] = useState(3);

  // Refs para rastreamento de tempo
  const pageLoadTime = useRef(Date.now());
  const modalOpenTime = useRef(null);

  // Hook de rastreamento
  const {
    trackFormStart,
    trackFormValidationError,
    trackFormDataCaptured,
    trackFormSubmit,
    trackFormSuccess,
    trackFormError,
    trackFormRedirect,
  } = useFormTracking({
    formName: 'lead_form_modal',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        graduationTime: '',
        source: source
      });
      setErrors({});
      setSubmitted(false);
      setCountdown(3);

      // Salva timestamp de abertura do modal para calcular tempo de preenchimento
      modalOpenTime.current = Date.now();

      // Rastrear quando o modal é aberto
      const captureData = getCaptureData(pageLoadTime.current, null);
      trackFormStart({
        page_path: captureData.page_path,
        utm_source: captureData.utm_source,
        utm_campaign: captureData.utm_campaign,
        time_on_site_seconds: captureData.time_on_site_seconds,
        device_type: captureData.device_type,
        is_returning_visitor: captureData.is_returning_visitor,
        modal_source: source,
      });
    }
  }, [isOpen, source, trackFormStart]);

  // Handle redirect after successful submission
  useEffect(() => {
    let countdownInterval;
    let redirectTimeout;

    if (submitted && checkoutUrl) {
      // Start countdown
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Set redirect after 3 seconds
      redirectTimeout = setTimeout(() => {
        // Usar buildTrackedUrl para adicionar UTMs e dados do form
        const trackedUrl = buildTrackedUrl(checkoutUrl);

        console.log('URL original:', checkoutUrl);
        console.log('URL com tracking:', trackedUrl);

        // Track redirect event
        trackFormRedirect(trackedUrl);

        window.location.href = trackedUrl;
      }, 3000);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      if (redirectTimeout) clearTimeout(redirectTimeout);
    };
  }, [submitted, checkoutUrl, trackFormRedirect]);

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome completo é obrigatório';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    }

    if (!formData.graduationTime) {
      newErrors.graduationTime = 'Tempo de formado é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length <= 11) {
      if (value.length > 6) {
        value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      } else if (value.length > 2) {
        value = value.replace(/(\d{2})(\d{5})/, '($1) $2');
      } else if (value.length > 0) {
        value = value.replace(/(\d{2})/, '($1');
      }
    }

    setFormData(prev => ({
      ...prev,
      phone: value
    }));

    if (errors.phone) {
      setErrors(prev => ({
        ...prev,
        phone: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Track validation error
      trackFormValidationError(Object.keys(errors));
      return;
    }

    setIsSubmitting(true);

    try {
      // Capturar TODOS os dados de tracking
      const captureData = getCaptureData(pageLoadTime.current, modalOpenTime.current);

      // Preparar dados para envio - baseado no código n8n fornecido
      const sitePath = typeof window !== 'undefined' ? window.location.pathname : '';
      const payload = {
        nome: formData.name,
        telefone: formData.phone,
        email: formData.email,
        tempo_de_formado: formData.graduationTime,
        utm_source: captureData.utm_source,
        utm_campaign: captureData.utm_campaign,
        utm_medium: captureData.utm_medium,
        utm_content: captureData.utm_content || formData.source,
        site_path: sitePath,
        tag: `lead_cf_fpg`
      };

      console.log('Enviando payload:', payload);

      // Rastrear dados capturados
      trackFormDataCaptured({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        graduationTime: formData.graduationTime,
        utm_source: captureData.utm_source,
        utm_medium: captureData.utm_medium,
        utm_campaign: captureData.utm_campaign,
        fbclid: captureData.fbclid,
        gclid: captureData.gclid,
        device_type: captureData.device_type,
        time_on_site_seconds: captureData.time_on_site_seconds,
        form_fill_time_seconds: captureData.form_fill_time_seconds,
        day_of_week: captureData.day_of_week,
        time_of_day: captureData.time_of_day,
        session_id: captureData.session_id,
        visit_count: captureData.visit_count,
        is_returning_visitor: captureData.is_returning_visitor,
      });

      // Rastrear submissão
      trackFormSubmit({
        form_name: 'lead_form_modal',
        utm_source: captureData.utm_source,
        utm_campaign: captureData.utm_campaign,
        device_type: captureData.device_type,
        time_on_site_seconds: captureData.time_on_site_seconds,
        form_fill_time_seconds: captureData.form_fill_time_seconds,
        is_returning_visitor: captureData.is_returning_visitor,
      });

      // Enviar para n8n webhook
      const response = await fetch('https://projetolm-n8n.8x0hqh.easypanel.host/webhook/e2033142-b528-46ff-9fe9-82100695342c', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // CORREÇÃO: Verificar se a resposta é JSON antes de fazer parse
      let responseData;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        // Se não for JSON, pegar como texto
        responseData = await response.text();
      }

      console.log('Resposta do webhook:', responseData);

      // Salvar dados do formulário no sessionStorage para usar na URL
      saveFormData({
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });

      // Rastrear sucesso
      trackFormSuccess({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        graduationTime: formData.graduationTime,
        utm_source: captureData.utm_source,
        utm_medium: captureData.utm_medium,
        utm_campaign: captureData.utm_campaign,
        fbclid: captureData.fbclid,
        gclid: captureData.gclid,
        device_type: captureData.device_type,
        time_on_site_seconds: captureData.time_on_site_seconds,
        form_fill_time_seconds: captureData.form_fill_time_seconds,
        day_of_week: captureData.day_of_week,
        time_of_day: captureData.time_of_day,
        hour_of_day: captureData.hour_of_day,
        session_id: captureData.session_id,
        visit_count: captureData.visit_count,
        is_returning_visitor: captureData.is_returning_visitor,
      });

      // Facebook Pixel tracking (se você usar)
      if (typeof fbq !== 'undefined') {
        fbq('track', 'Lead', {
          content_name: 'Sala Vermelha Lead Form',
          source: formData.source,
          value: 100,
          currency: 'BRL'
        });
      }

      setSubmitted(true);

    } catch (error) {
      console.error('Erro ao enviar lead:', error);
      setErrors({ submit: 'Erro ao enviar formulário. Verifique sua conexão e tente novamente.' });

      // Track error
      trackFormError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6 text-white relative overflow-hidden">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
          
          <div className="relative z-10">
           
            <h2 className="text-2xl items-center font-black mb-2">
              Quero estar preparado!
            </h2>
            <p className="text-white/90 text-sm">
              Receba acesso exclusivo a Formação Paciente Grave
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Nome completo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome completo *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Dr. João Silva"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email profissional *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="joao@exemplo.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Telefone celular *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors ${
                      errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Tempo de formado */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Quanto tempo de formado? *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    'Menos de 1 ano',
                    '1 - 2 anos',
                    '3 - 4 anos',
                    'Mais de 5 anos'
                  ].map(option => (
                    <label
                      key={option}
                      className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                        formData.graduationTime === option
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-red-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="graduationTime"
                        value={option}
                        checked={formData.graduationTime === option}
                        onChange={handleInputChange}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
                {errors.graduationTime && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.graduationTime}
                  </p>
                )}
              </div>

              {/* Submit error */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-600 font-medium flex items-center">
                    <AlertCircle size={16} className="mr-2" />
                    {errors.submit}
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Quero ter acesso exclusivo</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                   Seus dados estão seguros e não serão compartilhados
                </p>
              </div>
            </form>
          ) : (
            // Success state
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award size={32} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4">
                Perfeito! 
              </h3>
              <p className="text-gray-600 mb-6">
                Seu interesse foi registrado com sucesso! Em breve você receberá informações exclusivas sobre o curso.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-green-700 font-medium">
                  ✓ Dados enviados com sucesso<br />
                  ✓ Você receberá um email em breve<br />
                  ✓ Prepare-se para transformar sua carreira!
                </p>
              </div>
              
              {/* Redirect countdown - only show if checkoutUrl is available */}
              {checkoutUrl && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700 font-medium">
                    🚀 Redirecionando em {countdown} segundo{countdown !== 1 ? 's' : ''}...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadCaptureModal;