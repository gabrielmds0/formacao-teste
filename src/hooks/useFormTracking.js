import { useCallback } from 'react';
import ReactGA from 'react-ga4';

/**
 * Hook personalizado para rastreamento de formulários com Google Analytics 4
 * @param {Object} config - Configuração do hook
 * @param {string} config.formName - Nome do formulário para identificação nos eventos
 * @returns {Object} Funções de rastreamento
 */
export const useFormTracking = ({ formName = 'form' } = {}) => {
  /**
   * Rastreia o início/abertura do formulário
   */
  const trackFormStart = useCallback((additionalData = {}) => {
    ReactGA.event({
      category: 'Form',
      action: 'form_start',
      label: formName,
      ...additionalData,
    });
  }, [formName]);

  /**
   * Rastreia erros de validação do formulário
   */
  const trackFormValidationError = useCallback((errors = []) => {
    ReactGA.event({
      category: 'Form',
      action: 'form_validation_error',
      label: formName,
      value: errors.length,
      error_fields: errors.join(', '),
    });
  }, [formName]);

  /**
   * Rastreia quando os dados do formulário são capturados (preenchidos)
   */
  const trackFormDataCaptured = useCallback((data = {}) => {
    ReactGA.event({
      category: 'Form',
      action: 'form_data_captured',
      label: formName,
      ...data,
    });
  }, [formName]);

  /**
   * Rastreia a submissão do formulário
   */
  const trackFormSubmit = useCallback((additionalData = {}) => {
    ReactGA.event({
      category: 'Form',
      action: 'form_submit',
      label: formName,
      form_name: formName,
      ...additionalData,
    });
  }, [formName]);

  /**
   * Rastreia o sucesso do formulário
   */
  const trackFormSuccess = useCallback((data = {}) => {
    ReactGA.event({
      category: 'Form',
      action: 'form_success',
      label: formName,
      ...data,
    });
  }, [formName]);

  /**
   * Rastreia erros no envio do formulário
   */
  const trackFormError = useCallback((error) => {
    ReactGA.event({
      category: 'Form',
      action: 'form_error',
      label: formName,
      error_message: error?.message || 'Unknown error',
    });
  }, [formName]);

  /**
   * Rastreia redirecionamento após o formulário
   */
  const trackFormRedirect = useCallback((url) => {
    ReactGA.event({
      category: 'Form',
      action: 'form_redirect',
      label: formName,
      redirect_url: url,
    });
  }, [formName]);

  return {
    trackFormStart,
    trackFormValidationError,
    trackFormDataCaptured,
    trackFormSubmit,
    trackFormSuccess,
    trackFormError,
    trackFormRedirect,
  };
};
