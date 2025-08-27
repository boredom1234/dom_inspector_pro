/**
 * Validation Tracker - Captures form validation states and conditional logic
 * Monitors validation errors, conditional field dependencies, and form wizard steps
 */

// Global class declaration for content script compatibility
window.ValidationTracker = class ValidationTracker {
    constructor(options = {}) {
        this.options = {
            trackValidationStates: options.trackValidationStates !== false,
            trackErrorMessages: options.trackErrorMessages !== false,
            trackConditionalFields: options.trackConditionalFields !== false,
            trackFormSteps: options.trackFormSteps !== false,
            debounceDelay: options.debounceDelay || 300,
            ...options
        };
        
        this.validationStates = new Map();
        this.errorMessages = new Map();
        this.conditionalFields = new Map();
        this.formSteps = [];
        this.fieldDependencies = new Map();
        
        this.isTracking = false;
        this.observers = [];
        this.debounceTimers = new Map();
        
        // Validation patterns to detect
        this.validationPatterns = {
            errorClasses: [
                'error', 'invalid', 'has-error', 'field-error', 'form-error',
                'validation-error', 'is-invalid', 'ng-invalid', 'error-message'
            ],
            successClasses: [
                'valid', 'success', 'has-success', 'field-success', 'form-success',
                'validation-success', 'is-valid', 'ng-valid'
            ],
            errorSelectors: [
                '.error', '.invalid', '.has-error', '.field-error', '.form-error',
                '.validation-error', '.is-invalid', '.error-message', '.help-block.error',
                '[role="alert"]', '.alert-danger', '.text-danger'
            ],
            requiredSelectors: [
                '[required]', '[aria-required="true"]', '.required', '.mandatory'
            ]
        };
    }

    /**
     * Start validation tracking
     */
    startTracking() {
        if (this.isTracking) return;
        
        try {
            this.isTracking = true;
            this.setupValidationObservers();
            this.setupEventListeners();
            this.scanInitialValidationState();
            
            console.log('Validation tracking started');
            
        } catch (error) {
            console.error('Failed to start validation tracking:', error);
            this.isTracking = false;
        }
    }

    /**
     * Stop validation tracking
     */
    stopTracking() {
        if (!this.isTracking) return;
        
        try {
            this.isTracking = false;
            this.removeObservers();
            this.removeEventListeners();
            
            console.log('Validation tracking stopped');
            
        } catch (error) {
            console.error('Failed to stop validation tracking:', error);
        }
    }

    /**
     * Setup mutation observers for validation changes
     */
    setupValidationObservers() {
        // Observer for class changes (validation states)
        const classObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    this.handleClassChange(mutation.target);
                }
            });
        });

        // Observer for DOM changes (error messages, conditional fields)
        const domObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.handleElementAdded(node);
                        }
                    });
                    
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.handleElementRemoved(node);
                        }
                    });
                }
            });
        });

        // Observer for attribute changes (validation attributes)
        const attrObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    this.handleAttributeChange(mutation.target, mutation.attributeName);
                }
            });
        });

        // Start observing
        classObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
            subtree: true
        });

        domObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        attrObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['required', 'disabled', 'readonly', 'aria-required', 'aria-invalid'],
            subtree: true
        });

        this.observers.push(classObserver, domObserver, attrObserver);
    }

    /**
     * Setup event listeners for validation events
     */
    setupEventListeners() {
        // Form validation events
        document.addEventListener('invalid', this.handleInvalidEvent.bind(this), true);
        document.addEventListener('input', this.debounce('input', this.handleInputValidation.bind(this)), true);
        document.addEventListener('blur', this.handleBlurValidation.bind(this), true);
        document.addEventListener('submit', this.handleSubmitValidation.bind(this), true);
        
        // Custom validation events (many frameworks emit these)
        document.addEventListener('validation:error', this.handleCustomValidationError.bind(this), true);
        document.addEventListener('validation:success', this.handleCustomValidationSuccess.bind(this), true);
        document.addEventListener('form:step', this.handleFormStep.bind(this), true);
    }

    /**
     * Remove all observers and listeners
     */
    removeObservers() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        
        // Clear debounce timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }

    removeEventListeners() {
        // Event listeners are automatically removed when page unloads
        // For content scripts, we don't need explicit cleanup
    }

    /**
     * Scan initial validation state of the page
     */
    scanInitialValidationState() {
        try {
            // Find all form elements
            const formElements = document.querySelectorAll('input, select, textarea, form');
            
            formElements.forEach(element => {
                this.analyzeElementValidation(element);
            });

            // Find error messages
            this.scanErrorMessages();
            
            // Find conditional fields
            this.scanConditionalFields();
            
            // Detect form steps/wizards
            this.detectFormSteps();
            
        } catch (error) {
            console.warn('Error scanning initial validation state:', error);
        }
    }

    /**
     * Handle class changes for validation state detection
     */
    handleClassChange(element) {
        if (!this.isFormRelatedElement(element)) return;
        
        const previousState = this.validationStates.get(element);
        const currentState = this.analyzeElementValidation(element);
        
        if (this.hasValidationStateChanged(previousState, currentState)) {
            this.recordValidationChange(element, previousState, currentState);
        }
    }

    /**
     * Handle element addition (error messages, conditional fields)
     */
    handleElementAdded(element) {
        // Check if it's an error message
        if (this.isErrorMessage(element)) {
            this.recordErrorMessage(element, 'added');
        }
        
        // Check if it's a conditional field
        if (this.isConditionalField(element)) {
            this.recordConditionalField(element, 'shown');
        }
        
        // Recursively check children
        const children = element.querySelectorAll('*');
        children.forEach(child => {
            if (this.isErrorMessage(child)) {
                this.recordErrorMessage(child, 'added');
            }
            if (this.isConditionalField(child)) {
                this.recordConditionalField(child, 'shown');
            }
        });
    }

    /**
     * Handle element removal
     */
    handleElementRemoved(element) {
        if (this.isErrorMessage(element)) {
            this.recordErrorMessage(element, 'removed');
        }
        
        if (this.isConditionalField(element)) {
            this.recordConditionalField(element, 'hidden');
        }
    }

    /**
     * Handle attribute changes
     */
    handleAttributeChange(element, attributeName) {
        if (!this.isFormRelatedElement(element)) return;
        
        const validationData = {
            element: this.getElementIdentifier(element),
            attribute: attributeName,
            value: element.getAttribute(attributeName),
            timestamp: Date.now(),
            type: 'attribute_change'
        };
        
        this.sendValidationData('attribute_change', validationData);
    }

    /**
     * Handle HTML5 invalid events
     */
    handleInvalidEvent(event) {
        const element = event.target;
        const validationData = {
            element: this.getElementIdentifier(element),
            validationMessage: element.validationMessage,
            validity: this.getValidityState(element),
            timestamp: Date.now(),
            type: 'html5_invalid'
        };
        
        this.recordValidationChange(element, null, validationData);
    }

    /**
     * Handle input validation (debounced)
     */
    handleInputValidation(event) {
        const element = event.target;
        if (!this.isFormElement(element)) return;
        
        const validationState = this.analyzeElementValidation(element);
        const previousState = this.validationStates.get(element);
        
        if (this.hasValidationStateChanged(previousState, validationState)) {
            this.recordValidationChange(element, previousState, validationState);
        }
    }

    /**
     * Handle blur validation
     */
    handleBlurValidation(event) {
        const element = event.target;
        if (!this.isFormElement(element)) return;
        
        // Force validation check on blur
        const validationState = this.analyzeElementValidation(element);
        validationState.trigger = 'blur';
        
        this.recordValidationChange(element, this.validationStates.get(element), validationState);
    }

    /**
     * Handle form submission validation
     */
    handleSubmitValidation(event) {
        const form = event.target;
        if (form.tagName !== 'FORM') return;
        
        const formValidation = {
            form: this.getElementIdentifier(form),
            isValid: form.checkValidity(),
            invalidFields: [],
            timestamp: Date.now(),
            type: 'form_submission'
        };
        
        // Find invalid fields
        const formElements = form.querySelectorAll('input, select, textarea');
        formElements.forEach(element => {
            if (!element.checkValidity()) {
                formValidation.invalidFields.push({
                    element: this.getElementIdentifier(element),
                    validationMessage: element.validationMessage,
                    validity: this.getValidityState(element)
                });
            }
        });
        
        this.sendValidationData('form_submission', formValidation);
    }

    /**
     * Analyze element validation state
     */
    analyzeElementValidation(element) {
        const validationState = {
            element: this.getElementIdentifier(element),
            timestamp: Date.now(),
            isValid: null,
            isRequired: false,
            hasError: false,
            hasSuccess: false,
            errorMessages: [],
            validationClasses: [],
            customValidation: null
        };

        // Check HTML5 validity
        if (element.checkValidity) {
            validationState.isValid = element.checkValidity();
            validationState.validationMessage = element.validationMessage;
            validationState.validity = this.getValidityState(element);
        }

        // Check required state
        validationState.isRequired = element.required || 
                                   element.getAttribute('aria-required') === 'true' ||
                                   element.classList.contains('required');

        // Check validation classes
        const classList = Array.from(element.classList);
        validationState.validationClasses = classList;

        // Check for error classes
        validationState.hasError = this.validationPatterns.errorClasses.some(cls => 
            classList.includes(cls)
        );

        // Check for success classes
        validationState.hasSuccess = this.validationPatterns.successClasses.some(cls => 
            classList.includes(cls)
        );

        // Find associated error messages
        validationState.errorMessages = this.findAssociatedErrorMessages(element);

        // Check custom validation attributes
        validationState.customValidation = this.getCustomValidationData(element);

        // Store the state
        this.validationStates.set(element, validationState);

        return validationState;
    }

    /**
     * Find error messages associated with an element
     */
    findAssociatedErrorMessages(element) {
        const messages = [];
        
        // Check aria-describedby
        const describedBy = element.getAttribute('aria-describedby');
        if (describedBy) {
            const messageElement = document.getElementById(describedBy);
            if (messageElement) {
                messages.push({
                    text: messageElement.textContent.trim(),
                    element: this.getElementIdentifier(messageElement),
                    source: 'aria-describedby'
                });
            }
        }

        // Check nearby error elements
        const parent = element.parentElement;
        if (parent) {
            const errorElements = parent.querySelectorAll(this.validationPatterns.errorSelectors.join(','));
            errorElements.forEach(errorEl => {
                if (errorEl !== element && errorEl.textContent.trim()) {
                    messages.push({
                        text: errorEl.textContent.trim(),
                        element: this.getElementIdentifier(errorEl),
                        source: 'nearby_error'
                    });
                }
            });
        }

        return messages;
    }

    /**
     * Scan for error messages on the page
     */
    scanErrorMessages() {
        const errorElements = document.querySelectorAll(this.validationPatterns.errorSelectors.join(','));
        
        errorElements.forEach(element => {
            if (element.textContent.trim()) {
                this.recordErrorMessage(element, 'initial_scan');
            }
        });
    }

    /**
     * Scan for conditional fields
     */
    scanConditionalFields() {
        const allFields = document.querySelectorAll('input, select, textarea, fieldset, div[data-conditional]');
        
        allFields.forEach(field => {
            if (this.isConditionalField(field)) {
                this.recordConditionalField(field, 'initial_scan');
            }
        });
    }

    /**
     * Detect form steps/wizards
     */
    detectFormSteps() {
        // Look for common step indicators
        const stepIndicators = document.querySelectorAll(
            '.step, .wizard-step, .form-step, [data-step], .progress-step, .stepper-step'
        );
        
        if (stepIndicators.length > 1) {
            const steps = Array.from(stepIndicators).map((step, index) => ({
                element: this.getElementIdentifier(step),
                stepNumber: index + 1,
                isActive: step.classList.contains('active') || step.classList.contains('current'),
                isCompleted: step.classList.contains('completed') || step.classList.contains('done'),
                text: step.textContent.trim()
            }));
            
            this.formSteps = steps;
            this.sendValidationData('form_steps_detected', { steps });
        }
    }

    /**
     * Check if element is conditional
     */
    isConditionalField(element) {
        // Check for data attributes indicating conditional behavior
        const conditionalAttrs = [
            'data-conditional', 'data-depends-on', 'data-show-if', 'data-hide-if',
            'data-toggle', 'data-condition'
        ];
        
        return conditionalAttrs.some(attr => element.hasAttribute(attr)) ||
               element.style.display === 'none' ||
               element.hidden ||
               element.classList.contains('hidden') ||
               element.classList.contains('conditional');
    }

    /**
     * Check if element is an error message
     */
    isErrorMessage(element) {
        return this.validationPatterns.errorSelectors.some(selector => {
            try {
                return element.matches(selector);
            } catch (e) {
                return false;
            }
        }) || element.textContent.toLowerCase().includes('error') ||
               element.textContent.toLowerCase().includes('invalid') ||
               element.getAttribute('role') === 'alert';
    }

    /**
     * Record validation state change
     */
    recordValidationChange(element, previousState, currentState) {
        const changeData = {
            element: this.getElementIdentifier(element),
            previousState: previousState,
            currentState: currentState,
            timestamp: Date.now(),
            type: 'validation_change'
        };
        
        this.sendValidationData('validation_change', changeData);
    }

    /**
     * Record error message
     */
    recordErrorMessage(element, action) {
        const messageData = {
            element: this.getElementIdentifier(element),
            text: element.textContent.trim(),
            action: action, // 'added', 'removed', 'initial_scan'
            timestamp: Date.now(),
            type: 'error_message'
        };
        
        this.errorMessages.set(element, messageData);
        this.sendValidationData('error_message', messageData);
    }

    /**
     * Record conditional field change
     */
    recordConditionalField(element, action) {
        const fieldData = {
            element: this.getElementIdentifier(element),
            action: action, // 'shown', 'hidden', 'initial_scan'
            isVisible: DOMUtils.isElementVisible(element),
            dependencies: this.findFieldDependencies(element),
            timestamp: Date.now(),
            type: 'conditional_field'
        };
        
        this.conditionalFields.set(element, fieldData);
        this.sendValidationData('conditional_field', fieldData);
    }

    /**
     * Find field dependencies
     */
    findFieldDependencies(element) {
        const dependencies = [];
        
        // Check data attributes for dependencies
        const dependsOn = element.getAttribute('data-depends-on');
        if (dependsOn) {
            dependencies.push({
                type: 'depends-on',
                target: dependsOn
            });
        }
        
        const showIf = element.getAttribute('data-show-if');
        if (showIf) {
            dependencies.push({
                type: 'show-if',
                condition: showIf
            });
        }
        
        return dependencies;
    }

    /**
     * Send validation data to background script
     */
    sendValidationData(type, data) {
        try {
            chrome.runtime.sendMessage({
                action: window.MESSAGE_TYPES.VALIDATION_DATA,
                validationType: type,
                data: data,
                url: window.location.href,
                timestamp: Date.now()
            }).catch(error => {
                console.warn('Failed to send validation data:', error);
            });
        } catch (error) {
            console.warn('Error sending validation data:', error);
        }
    }

    /**
     * Helper methods
     */
    
    getElementIdentifier(element) {
        return {
            tagName: element.tagName.toLowerCase(),
            id: element.id || null,
            name: element.name || null,
            className: element.className || null,
            xpath: DOMUtils.generateXPath(element),
            cssSelector: DOMUtils.generateCSSSelector(element)
        };
    }
    
    getValidityState(element) {
        if (!element.validity) return null;
        
        return {
            valid: element.validity.valid,
            valueMissing: element.validity.valueMissing,
            typeMismatch: element.validity.typeMismatch,
            patternMismatch: element.validity.patternMismatch,
            tooLong: element.validity.tooLong,
            tooShort: element.validity.tooShort,
            rangeUnderflow: element.validity.rangeUnderflow,
            rangeOverflow: element.validity.rangeOverflow,
            stepMismatch: element.validity.stepMismatch,
            badInput: element.validity.badInput,
            customError: element.validity.customError
        };
    }
    
    getCustomValidationData(element) {
        const customData = {};
        
        // Check for custom validation attributes
        const customAttrs = [
            'data-validate', 'data-validation', 'data-rules', 'data-pattern',
            'data-min', 'data-max', 'data-length', 'data-custom-validation'
        ];
        
        customAttrs.forEach(attr => {
            const value = element.getAttribute(attr);
            if (value) {
                customData[attr] = value;
            }
        });
        
        return Object.keys(customData).length > 0 ? customData : null;
    }
    
    isFormElement(element) {
        const formTags = ['input', 'select', 'textarea'];
        return formTags.includes(element.tagName.toLowerCase());
    }
    
    isFormRelatedElement(element) {
        const formRelatedTags = ['input', 'select', 'textarea', 'form', 'fieldset', 'label'];
        return formRelatedTags.includes(element.tagName.toLowerCase()) ||
               element.classList.contains('form-control') ||
               element.classList.contains('form-field') ||
               element.hasAttribute('data-validation');
    }
    
    hasValidationStateChanged(previous, current) {
        if (!previous) return true;
        
        return previous.isValid !== current.isValid ||
               previous.hasError !== current.hasError ||
               previous.hasSuccess !== current.hasSuccess ||
               previous.errorMessages.length !== current.errorMessages.length;
    }
    
    debounce(key, func, wait = this.options.debounceDelay) {
        return (...args) => {
            const timer = this.debounceTimers.get(key);
            if (timer) {
                clearTimeout(timer);
            }
            
            this.debounceTimers.set(key, setTimeout(() => {
                func.apply(this, args);
                this.debounceTimers.delete(key);
            }, wait));
        };
    }

    /**
     * Custom validation event handlers
     */
    handleCustomValidationError(event) {
        const data = {
            element: this.getElementIdentifier(event.target),
            errorType: event.detail?.type || 'custom',
            message: event.detail?.message || '',
            timestamp: Date.now(),
            type: 'custom_validation_error'
        };
        
        this.sendValidationData('custom_validation_error', data);
    }
    
    handleCustomValidationSuccess(event) {
        const data = {
            element: this.getElementIdentifier(event.target),
            successType: event.detail?.type || 'custom',
            message: event.detail?.message || '',
            timestamp: Date.now(),
            type: 'custom_validation_success'
        };
        
        this.sendValidationData('custom_validation_success', data);
    }
    
    handleFormStep(event) {
        const stepData = {
            currentStep: event.detail?.currentStep || 0,
            totalSteps: event.detail?.totalSteps || 0,
            stepName: event.detail?.stepName || '',
            direction: event.detail?.direction || 'forward',
            timestamp: Date.now(),
            type: 'form_step_change'
        };
        
        this.formSteps.push(stepData);
        this.sendValidationData('form_step_change', stepData);
    }

    /**
     * Public methods
     */
    
    getValidationStates() {
        return Array.from(this.validationStates.values());
    }
    
    getErrorMessages() {
        return Array.from(this.errorMessages.values());
    }
    
    getConditionalFields() {
        return Array.from(this.conditionalFields.values());
    }
    
    getFormSteps() {
        return this.formSteps;
    }
    
    getCurrentValidationSummary() {
        return {
            totalFields: this.validationStates.size,
            invalidFields: Array.from(this.validationStates.values()).filter(state => state.isValid === false).length,
            errorMessages: this.errorMessages.size,
            conditionalFields: this.conditionalFields.size,
            formSteps: this.formSteps.length,
            timestamp: Date.now()
        };
    }
}

export default ValidationTracker;
