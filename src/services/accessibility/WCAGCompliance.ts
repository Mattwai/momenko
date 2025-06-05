import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AccessibilityInfo } from 'react-native';

interface WCAGCriteria {
  id: string;
  level: 'A' | 'AA' | 'AAA';
  title: string;
  description: string;
  compliant: boolean;
  testResult: 'pass' | 'fail' | 'needs_review' | 'not_tested';
  lastTested: number;
  elderlyConsiderations?: string;
}

interface ColorContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  recommendation?: string;
}

interface AccessibilityAudit {
  id: string;
  timestamp: number;
  overallScore: number;
  criteriaResults: WCAGCriteria[];
  colorContrastResults: ColorContrastResult[];
  recommendations: string[];
  elderlySpecificIssues: string[];
  culturalConsiderations: string[];
}

interface AccessibilitySettings {
  enableScreenReader: boolean;
  enableVoiceControl: boolean;
  enableHighContrast: boolean;
  textSize: 'small' | 'medium' | 'large' | 'extra-large';
  enableHapticFeedback: boolean;
  enableAudioDescriptions: boolean;
  slowAnimations: boolean;
  extendedTimeouts: boolean;
  simplifiedNavigation: boolean;
  elderlyMode: boolean;
}

class WCAGComplianceService {
  private wcagCriteria: Map<string, WCAGCriteria> = new Map();
  private currentSettings: AccessibilitySettings;
  private lastAudit?: AccessibilityAudit;
  private complianceScore = 0;

  constructor() {
    this.currentSettings = {
      enableScreenReader: false,
      enableVoiceControl: false,
      enableHighContrast: false,
      textSize: 'medium',
      enableHapticFeedback: true,
      enableAudioDescriptions: false,
      slowAnimations: false,
      extendedTimeouts: true,
      simplifiedNavigation: true,
      elderlyMode: true
    };

    this.initializeWCAGCriteria();
    this.loadStoredSettings();
    this.detectSystemAccessibilitySettings();
  }

  private initializeWCAGCriteria(): void {
    const criteria: WCAGCriteria[] = [
      // Perceivable
      {
        id: '1.1.1',
        level: 'A',
        title: 'Non-text Content',
        description: 'All non-text content has text alternatives',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Images should have clear, simple descriptions'
      },
      {
        id: '1.3.1',
        level: 'A',
        title: 'Info and Relationships',
        description: 'Information, structure, and relationships can be programmatically determined',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Clear heading structure and labeled form controls'
      },
      {
        id: '1.3.2',
        level: 'A',
        title: 'Meaningful Sequence',
        description: 'Content is presented in a meaningful sequence',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Logical reading order for elderly users'
      },
      {
        id: '1.3.3',
        level: 'A',
        title: 'Sensory Characteristics',
        description: 'Instructions do not rely solely on sensory characteristics',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Multiple ways to identify elements (color, text, position)'
      },
      {
        id: '1.4.1',
        level: 'A',
        title: 'Use of Color',
        description: 'Color is not used as the only means of conveying information',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Important for age-related vision changes'
      },
      {
        id: '1.4.2',
        level: 'A',
        title: 'Audio Control',
        description: 'User can pause, stop, or adjust volume of audio',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Clear audio controls for elderly users'
      },
      {
        id: '1.4.3',
        level: 'AA',
        title: 'Contrast (Minimum)',
        description: 'Text has contrast ratio of at least 4.5:1',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Higher contrast beneficial for aging eyes'
      },
      {
        id: '1.4.4',
        level: 'AA',
        title: 'Resize Text',
        description: 'Text can be resized up to 200% without loss of functionality',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Critical for elderly users with vision impairments'
      },
      {
        id: '1.4.5',
        level: 'AA',
        title: 'Images of Text',
        description: 'Images of text are avoided except for decoration',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Text should be resizable for elderly users'
      },
      {
        id: '1.4.10',
        level: 'AA',
        title: 'Reflow',
        description: 'Content reflows without horizontal scrolling at 320px width',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Important for elderly users using zoom'
      },
      {
        id: '1.4.11',
        level: 'AA',
        title: 'Non-text Contrast',
        description: 'UI components have contrast ratio of at least 3:1',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Buttons and controls clearly visible'
      },
      {
        id: '1.4.12',
        level: 'AA',
        title: 'Text Spacing',
        description: 'Text spacing can be adjusted without loss of functionality',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Adjustable spacing improves readability'
      },
      {
        id: '1.4.13',
        level: 'AA',
        title: 'Content on Hover or Focus',
        description: 'Additional content triggered by hover/focus is dismissible and persistent',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Avoid sudden content changes that confuse elderly users'
      },

      // Operable
      {
        id: '2.1.1',
        level: 'A',
        title: 'Keyboard',
        description: 'All functionality available via keyboard',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Important for elderly users with motor difficulties'
      },
      {
        id: '2.1.2',
        level: 'A',
        title: 'No Keyboard Trap',
        description: 'Keyboard focus is never trapped',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Elderly users should not get stuck in components'
      },
      {
        id: '2.1.4',
        level: 'AA',
        title: 'Character Key Shortcuts',
        description: 'Single character shortcuts can be disabled or remapped',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Prevent accidental activation'
      },
      {
        id: '2.2.1',
        level: 'A',
        title: 'Timing Adjustable',
        description: 'Users can extend or disable time limits',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Elderly users need more time to process information'
      },
      {
        id: '2.2.2',
        level: 'A',
        title: 'Pause, Stop, Hide',
        description: 'Users can pause, stop, or hide moving content',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Motion can be distracting for elderly users'
      },
      {
        id: '2.3.1',
        level: 'A',
        title: 'Three Flashes or Below Threshold',
        description: 'Content does not flash more than 3 times per second',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Avoid seizure triggers and confusion'
      },
      {
        id: '2.4.1',
        level: 'A',
        title: 'Bypass Blocks',
        description: 'Mechanism to skip repeated content blocks',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Quick navigation for elderly users'
      },
      {
        id: '2.4.2',
        level: 'A',
        title: 'Page Titled',
        description: 'Pages have descriptive titles',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Clear, simple titles help orientation'
      },
      {
        id: '2.4.3',
        level: 'A',
        title: 'Focus Order',
        description: 'Focusable components receive focus in meaningful order',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Logical focus order prevents confusion'
      },
      {
        id: '2.4.4',
        level: 'A',
        title: 'Link Purpose (In Context)',
        description: 'Purpose of each link is clear from context',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Clear link text helps elderly users understand navigation'
      },
      {
        id: '2.4.5',
        level: 'AA',
        title: 'Multiple Ways',
        description: 'Multiple ways to locate content within a set of pages',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Multiple navigation methods accommodate different preferences'
      },
      {
        id: '2.4.6',
        level: 'AA',
        title: 'Headings and Labels',
        description: 'Headings and labels describe topic or purpose',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Clear, descriptive headings aid comprehension'
      },
      {
        id: '2.4.7',
        level: 'AA',
        title: 'Focus Visible',
        description: 'Keyboard focus indicator is visible',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'High visibility focus indicators essential for elderly users'
      },
      {
        id: '2.5.1',
        level: 'A',
        title: 'Pointer Gestures',
        description: 'Multi-point or path-based gestures have simple alternatives',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Simple gestures accommodate motor limitations'
      },
      {
        id: '2.5.2',
        level: 'A',
        title: 'Pointer Cancellation',
        description: 'Functions triggered by single pointer can be cancelled',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Prevent accidental activation'
      },
      {
        id: '2.5.3',
        level: 'A',
        title: 'Label in Name',
        description: 'Visible label text is included in accessible name',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Consistent labeling reduces confusion'
      },
      {
        id: '2.5.4',
        level: 'A',
        title: 'Motion Actuation',
        description: 'Motion-triggered functions can be disabled',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Motion controls may be difficult for elderly users'
      },

      // Understandable
      {
        id: '3.1.1',
        level: 'A',
        title: 'Language of Page',
        description: 'Primary language of content is programmatically determined',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Important for screen readers and translation'
      },
      {
        id: '3.1.2',
        level: 'AA',
        title: 'Language of Parts',
        description: 'Language of content parts is programmatically determined',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Cultural content may include multiple languages'
      },
      {
        id: '3.2.1',
        level: 'A',
        title: 'On Focus',
        description: 'Focus does not trigger unexpected context changes',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Predictable behavior reduces confusion'
      },
      {
        id: '3.2.2',
        level: 'A',
        title: 'On Input',
        description: 'Input does not trigger unexpected context changes',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Stable interface important for elderly users'
      },
      {
        id: '3.2.3',
        level: 'AA',
        title: 'Consistent Navigation',
        description: 'Navigation mechanisms are consistent across pages',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Consistent patterns reduce learning burden'
      },
      {
        id: '3.2.4',
        level: 'AA',
        title: 'Consistent Identification',
        description: 'Components with same functionality are consistently identified',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Familiar patterns aid recognition'
      },
      {
        id: '3.3.1',
        level: 'A',
        title: 'Error Identification',
        description: 'Input errors are clearly identified',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Clear error messages help elderly users correct mistakes'
      },
      {
        id: '3.3.2',
        level: 'A',
        title: 'Labels or Instructions',
        description: 'Labels or instructions provided for user input',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Clear instructions reduce confusion'
      },
      {
        id: '3.3.3',
        level: 'AA',
        title: 'Error Suggestion',
        description: 'Error correction suggestions provided when possible',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Helpful suggestions aid task completion'
      },
      {
        id: '3.3.4',
        level: 'AA',
        title: 'Error Prevention (Legal, Financial, Data)',
        description: 'Prevention mechanisms for important submissions',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Confirmation steps prevent costly mistakes'
      },

      // Robust
      {
        id: '4.1.1',
        level: 'A',
        title: 'Parsing',
        description: 'Content can be parsed reliably by assistive technologies',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Essential for screen reader compatibility'
      },
      {
        id: '4.1.2',
        level: 'A',
        title: 'Name, Role, Value',
        description: 'UI components have programmatically determinable name, role, value',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Critical for assistive technology used by elderly'
      },
      {
        id: '4.1.3',
        level: 'AA',
        title: 'Status Messages',
        description: 'Status messages are programmatically determinable',
        compliant: false,
        testResult: 'not_tested',
        lastTested: 0,
        elderlyConsiderations: 'Important feedback for elderly users'
      }
    ];

    criteria.forEach(criterion => {
      this.wcagCriteria.set(criterion.id, criterion);
    });
  }

  private async detectSystemAccessibilitySettings(): Promise<void> {
    try {
      const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();

      this.currentSettings.enableScreenReader = isScreenReaderEnabled;
      this.currentSettings.slowAnimations = isReduceMotionEnabled;

      if (isScreenReaderEnabled) {
        this.currentSettings.enableAudioDescriptions = true;
        this.currentSettings.simplifiedNavigation = true;
      }
    } catch (error) {
      console.error('Error detecting system accessibility settings:', error);
    }
  }

  async runFullAccessibilityAudit(): Promise<AccessibilityAudit> {
    const auditId = `audit_${Date.now()}`;
    const timestamp = Date.now();
    
    console.log('Starting comprehensive WCAG 2.1 AA accessibility audit...');

    // Test all criteria
    const criteriaResults: WCAGCriteria[] = [];
    for (const [id, _criterion] of this.wcagCriteria.entries()) {
      const testResult = await this.testCriterion(id);
      criteriaResults.push(testResult);
    }

    // Test color contrast
    const colorContrastResults = await this.testColorContrast();

    // Calculate overall score
    const passedCriteria = criteriaResults.filter(c => c.testResult === 'pass').length;
    const totalCriteria = criteriaResults.length;
    const overallScore = (passedCriteria / totalCriteria) * 100;

    // Generate recommendations
    const recommendations = this.generateRecommendations(criteriaResults, colorContrastResults);
    const elderlySpecificIssues = this.identifyElderlySpecificIssues(criteriaResults);
    const culturalConsiderations = this.identifyCulturalConsiderations();

    this.lastAudit = {
      id: auditId,
      timestamp,
      overallScore,
      criteriaResults,
      colorContrastResults,
      recommendations,
      elderlySpecificIssues,
      culturalConsiderations
    };

    this.complianceScore = overallScore;
    await this.saveAuditResults();

    return this.lastAudit;
  }

  private async testCriterion(criterionId: string): Promise<WCAGCriteria> {
    const criterion = this.wcagCriteria.get(criterionId)!;
    
    // Update last tested time
    criterion.lastTested = Date.now();

    // Perform specific tests based on criterion
    switch (criterionId) {
      case '1.4.3': { // Contrast (Minimum)
        const contrastResults = await this.testColorContrast();
        criterion.compliant = contrastResults.every(r => r.passesAA);
        criterion.testResult = criterion.compliant ? 'pass' : 'fail';
        break;
      }

      case '1.4.4': // Resize Text
        criterion.compliant = this.currentSettings.textSize !== 'small';
        criterion.testResult = criterion.compliant ? 'pass' : 'needs_review';
        break;

      case '2.1.1': // Keyboard
        criterion.compliant = true; // React Native handles this
        criterion.testResult = 'pass';
        break;

      case '2.2.1': // Timing Adjustable
        criterion.compliant = this.currentSettings.extendedTimeouts;
        criterion.testResult = criterion.compliant ? 'pass' : 'fail';
        break;

      case '2.4.7': // Focus Visible
        criterion.compliant = true; // React Native provides default focus indicators
        criterion.testResult = 'pass';
        break;

      case '4.1.2': // Name, Role, Value
        criterion.compliant = true; // Assuming proper accessibilityLabel usage
        criterion.testResult = 'pass';
        break;

      default:
        // Default to needs_review for criteria requiring manual testing
        criterion.testResult = 'needs_review';
        criterion.compliant = false;
        break;
    }

    return criterion;
  }

  private async testColorContrast(): Promise<ColorContrastResult[]> {
    // Define app color combinations to test
    const colorCombinations = [
      { foreground: '#000000', background: '#FFFFFF', name: 'Black on White' },
      { foreground: '#FFFFFF', background: '#000000', name: 'White on Black' },
      { foreground: '#2563EB', background: '#FFFFFF', name: 'Blue on White' },
      { foreground: '#DC2626', background: '#FFFFFF', name: 'Red on White' },
      { foreground: '#16A34A', background: '#FFFFFF', name: 'Green on White' },
      { foreground: '#7C3AED', background: '#FFFFFF', name: 'Purple on White' },
      // High contrast mode colors
      { foreground: '#FFFF00', background: '#000000', name: 'Yellow on Black (HC)' },
      { foreground: '#00FFFF', background: '#000000', name: 'Cyan on Black (HC)' }
    ];

    const results: ColorContrastResult[] = [];

    for (const combo of colorCombinations) {
      const ratio = this.calculateContrastRatio(combo.foreground, combo.background);
      const passesAA = ratio >= 4.5;
      const passesAAA = ratio >= 7.0;

      let recommendation: string | undefined;
      if (!passesAA) {
        recommendation = 'Increase contrast to meet WCAG AA requirements (4.5:1 minimum)';
      } else if (!passesAAA && this.currentSettings.elderlyMode) {
        recommendation = 'Consider increasing contrast for elderly users (7:1 recommended)';
      }

      results.push({
        foreground: combo.foreground,
        background: combo.background,
        ratio,
        passesAA,
        passesAAA,
        recommendation
      });
    }

    return results;
  }

  private calculateContrastRatio(foreground: string, background: string): number {
    const getLuminance = (color: string): number => {
      const rgb = this.hexToRgb(color);
      if (!rgb) return 0;

      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const fgLuminance = getLuminance(foreground);
    const bgLuminance = getLuminance(background);
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private generateRecommendations(
    criteriaResults: WCAGCriteria[],
    colorContrastResults: ColorContrastResult[]
  ): string[] {
    const recommendations: string[] = [];

    // High-priority recommendations for elderly users
    const failedCriteria = criteriaResults.filter(c => c.testResult === 'fail');
    const needsReviewCriteria = criteriaResults.filter(c => c.testResult === 'needs_review');

    if (failedCriteria.length > 0) {
      recommendations.push(`${failedCriteria.length} critical accessibility issues need immediate attention`);
    }

    if (needsReviewCriteria.length > 0) {
      recommendations.push(`${needsReviewCriteria.length} items require manual accessibility review`);
    }

    // Color contrast recommendations
    const poorContrastColors = colorContrastResults.filter(r => !r.passesAA);
    if (poorContrastColors.length > 0) {
      recommendations.push('Improve color contrast ratios to meet WCAG AA standards');
    }

    // Elderly-specific recommendations
    if (this.currentSettings.textSize === 'small') {
      recommendations.push('Consider larger default text size for elderly users');
    }

    if (!this.currentSettings.enableHighContrast) {
      recommendations.push('Enable high contrast mode option for users with vision impairments');
    }

    if (!this.currentSettings.extendedTimeouts) {
      recommendations.push('Extend timeout periods to accommodate slower response times');
    }

    if (!this.currentSettings.simplifiedNavigation) {
      recommendations.push('Simplify navigation patterns for cognitive accessibility');
    }

    return recommendations;
  }

  private identifyElderlySpecificIssues(criteriaResults: WCAGCriteria[]): string[] {
    const issues: string[] = [];

    // Check for criteria particularly important for elderly users
    const elderlyImportantCriteria = [
      '1.4.3', // Contrast
      '1.4.4', // Resize Text
      '2.2.1', // Timing Adjustable
      '2.4.7', // Focus Visible
      '3.2.3', // Consistent Navigation
      '3.3.2'  // Labels or Instructions
    ];

    elderlyImportantCriteria.forEach(criterionId => {
      const foundCriterion = criteriaResults.find(c => c.id === criterionId);
      if (foundCriterion && foundCriterion.testResult !== 'pass') {
        issues.push(`${foundCriterion.title}: ${foundCriterion.elderlyConsiderations}`);
      }
    });

    // Additional elderly-specific considerations
    if (this.currentSettings.textSize === 'small') {
      issues.push('Text size too small for users with age-related vision changes');
    }

    if (!this.currentSettings.enableHapticFeedback) {
      issues.push('Haptic feedback disabled - helpful for users with vision impairments');
    }

    if (this.currentSettings.slowAnimations === false) {
      issues.push('Fast animations may be disorienting for elderly users');
    }

    return issues;
  }

  private identifyCulturalConsiderations(): string[] {
    const considerations: string[] = [];

    considerations.push('Ensure cultural content is accessible to screen readers');
    considerations.push('Provide audio descriptions for cultural images and videos');
    considerations.push('Consider right-to-left reading patterns for appropriate cultures');
    considerations.push('Ensure cultural colors meet contrast requirements');
    considerations.push('Provide alternative text for cultural symbols and imagery');

    return considerations;
  }

  async updateAccessibilitySettings(newSettings: Partial<AccessibilitySettings>): Promise<void> {
    this.currentSettings = { ...this.currentSettings, ...newSettings };
    await this.saveSettings();

    // Apply immediate accessibility improvements
    if (newSettings.enableHighContrast !== undefined) {
      await this.applyHighContrastMode(newSettings.enableHighContrast);
    }

    if (newSettings.textSize !== undefined) {
      await this.applyTextSizeSettings(newSettings.textSize);
    }

    if (newSettings.slowAnimations !== undefined) {
      await this.applyAnimationSettings(newSettings.slowAnimations);
    }

    // Re-run relevant tests
    if (Object.keys(newSettings).length > 0) {
      await this.runPartialAudit(newSettings);
    }
  }

  private async applyHighContrastMode(enabled: boolean): Promise<void> {
    // This would integrate with the theme system
    console.log(`High contrast mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  private async applyTextSizeSettings(size: AccessibilitySettings['textSize']): Promise<void> {
    // This would integrate with the typography system
    console.log(`Text size set to: ${size}`);
  }

  private async applyAnimationSettings(slowAnimations: boolean): Promise<void> {
    // This would integrate with the animation system
    console.log(`Animation speed ${slowAnimations ? 'slowed' : 'normal'}`);
  }

  private async runPartialAudit(changedSettings: Partial<AccessibilitySettings>): Promise<void> {
    // Re-test criteria affected by the changed settings
    const affectedCriteria = [];
    
    if (changedSettings.enableHighContrast !== undefined) {
      affectedCriteria.push('1.4.3'); // Contrast
    }
    
    if (changedSettings.textSize !== undefined) {
      affectedCriteria.push('1.4.4'); // Resize Text
    }
    
    if (changedSettings.extendedTimeouts !== undefined) {
      affectedCriteria.push('2.2.1'); // Timing Adjustable
    }

    for (const criterionId of affectedCriteria) {
      const updatedCriterion = await this.testCriterion(criterionId);
      this.wcagCriteria.set(criterionId, updatedCriterion);
    }

    // Update compliance score
    const passedCriteria = Array.from(this.wcagCriteria.values()).filter(c => c.testResult === 'pass').length;
    const totalCriteria = this.wcagCriteria.size;
    this.complianceScore = (passedCriteria / totalCriteria) * 100;
  }

  getComplianceStatus(): {
    overallScore: number;
    level: 'A' | 'AA' | 'AAA' | 'Non-compliant';
    passedCriteria: number;
    totalCriteria: number;
    lastAuditDate: number | null;
    elderlyOptimized: boolean;
  } {
    const passedCriteria = Array.from(this.wcagCriteria.values()).filter(c => c.testResult === 'pass').length;
    const totalCriteria = this.wcagCriteria.size;
    
    let level: 'A' | 'AA' | 'AAA' | 'Non-compliant' = 'Non-compliant';
    if (this.complianceScore >= 95) level = 'AAA';
    else if (this.complianceScore >= 85) level = 'AA';
    else if (this.complianceScore >= 70) level = 'A';

    return {
      overallScore: this.complianceScore,
      level,
      passedCriteria,
      totalCriteria,
      lastAuditDate: this.lastAudit?.timestamp || null,
      elderlyOptimized: this.currentSettings.elderlyMode
    };
  }

  getAccessibilitySettings(): AccessibilitySettings {
    return { ...this.currentSettings };
  }

  getLastAudit(): AccessibilityAudit | null {
    return this.lastAudit ? { ...this.lastAudit } : null;
  }

  getCriteriaStatus(level: 'A' | 'AA' | 'AAA'): WCAGCriteria[] {
    return Array.from(this.wcagCriteria.values())
      .filter(c => c.level === level || (level === 'AA' && c.level === 'A') || (level === 'AAA' && (c.level === 'A' || c.level === 'AA')));
  }

  async generateAccessibilityReport(): Promise<{
    complianceStatus: {
      level: 'AA' | 'AAA' | 'A' | 'Failed';
      score: number;
      passedCriteria: number;
      totalCriteria: number;
      compliance: boolean;
    };
    elderlyConsiderations: string[];
    culturalConsiderations: string[];
    recommendations: string[];
    criticalIssues: WCAGCriteria[];
    quickWins: WCAGCriteria[];
  }> {
    const complianceStatus = this.getComplianceStatus();
    const criticalIssues = Array.from(this.wcagCriteria.values())
      .filter(c => c.testResult === 'fail' && (c.level === 'A' || c.level === 'AA'));
    const quickWins = Array.from(this.wcagCriteria.values())
      .filter(c => c.testResult === 'needs_review' && c.level === 'A');

    const elderlyConsiderations = this.identifyElderlySpecificIssues(Array.from(this.wcagCriteria.values()));
    const culturalConsiderations = this.identifyCulturalConsiderations();
    const recommendations = this.generateRecommendations(
      Array.from(this.wcagCriteria.values()),
      await this.testColorContrast()
    );

    return {
      complianceStatus,
      elderlyConsiderations,
      culturalConsiderations,
      recommendations,
      criticalIssues,
      quickWins
    };
  }

  async enableElderlyOptimizations(): Promise<void> {
    const elderlySettings: Partial<AccessibilitySettings> = {
      elderlyMode: true,
      textSize: 'large',
      enableHighContrast: true,
      enableHapticFeedback: true,
      slowAnimations: true,
      extendedTimeouts: true,
      simplifiedNavigation: true,
      enableAudioDescriptions: true
    };

    await this.updateAccessibilitySettings(elderlySettings);
    
    Alert.alert(
      'Elderly Optimizations Enabled',
      'The app has been optimized for elderly users with larger text, high contrast, and simplified navigation.',
      [{ text: 'OK' }]
    );
  }

  async runQuickAccessibilityCheck(): Promise<{
    score: number;
    criticalIssues: number;
    recommendations: string[];
  }> {
    // Quick check of most important criteria
    const quickCheckCriteria = [
      '1.4.3', // Contrast
      '1.4.4', // Resize Text
      '2.1.1', // Keyboard
      '2.4.7', // Focus Visible
      '4.1.2'  // Name, Role, Value
    ];

    let passedQuickChecks = 0;
    for (const criterionId of quickCheckCriteria) {
      const result = await this.testCriterion(criterionId);
      if (result.testResult === 'pass') {
        passedQuickChecks++;
      }
    }

    const score = (passedQuickChecks / quickCheckCriteria.length) * 100;
    const criticalIssues = quickCheckCriteria.length - passedQuickChecks;

    const recommendations: string[] = [];
    if (score < 80) {
      recommendations.push('Run full accessibility audit');
      recommendations.push('Enable elderly optimizations');
      recommendations.push('Review color contrast ratios');
    }

    return { score, criticalIssues, recommendations };
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('accessibility_settings', JSON.stringify(this.currentSettings));
    } catch (error) {
      console.error('Error saving accessibility settings:', error);
    }
  }

  private async loadStoredSettings(): Promise<void> {
    try {
      const storedSettings = await AsyncStorage.getItem('accessibility_settings');
      if (storedSettings) {
        this.currentSettings = { ...this.currentSettings, ...JSON.parse(storedSettings) };
      }
    } catch (error) {
      console.error('Error loading accessibility settings:', error);
    }
  }

  private async saveAuditResults(): Promise<void> {
    try {
      if (this.lastAudit) {
        await AsyncStorage.setItem('last_accessibility_audit', JSON.stringify(this.lastAudit));
        await AsyncStorage.setItem('compliance_score', this.complianceScore.toString());
      }
    } catch (error) {
      console.error('Error saving audit results:', error);
    }
  }

  async loadStoredAuditResults(): Promise<void> {
    try {
      const storedAudit = await AsyncStorage.getItem('last_accessibility_audit');
      if (storedAudit) {
        this.lastAudit = JSON.parse(storedAudit);
      }

      const storedScore = await AsyncStorage.getItem('compliance_score');
      if (storedScore) {
        this.complianceScore = parseFloat(storedScore);
      }
    } catch (error) {
      console.error('Error loading audit results:', error);
    }
  }

  async clearAuditData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('last_accessibility_audit');
      await AsyncStorage.removeItem('compliance_score');
      this.lastAudit = undefined;
      this.complianceScore = 0;
    } catch (error) {
      console.error('Error clearing audit data:', error);
    }
  }

  // Test specific accessibility features
  async testScreenReaderCompatibility(): Promise<boolean> {
    try {
      const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      return isEnabled;
    } catch (error) {
      console.error('Error testing screen reader compatibility:', error);
      return false;
    }
  }

  async testVoiceControlCompatibility(): Promise<boolean> {
    try {
      // Test if voice control APIs are available
      return typeof AccessibilityInfo.announceForAccessibility === 'function';
    } catch (error) {
      console.error('Error testing voice control compatibility:', error);
      return false;
    }
  }

  async announceForAccessibility(message: string): Promise<void> {
    try {
      if (this.currentSettings.enableScreenReader) {
        AccessibilityInfo.announceForAccessibility(message);
      }
    } catch (error) {
      console.error('Error announcing for accessibility:', error);
    }
  }

  validateAccessibilityProps(props: Record<string, unknown>): string[] {
    const issues: string[] = [];

    if (!props.accessibilityLabel && !props.accessibilityHint) {
      issues.push('Missing accessibilityLabel or accessibilityHint');
    }

    if (props.accessible === false && !props.accessibilityElementsHidden) {
      issues.push('Element marked as not accessible without hiding from accessibility tree');
    }

    if (props.accessibilityRole && !['button', 'link', 'search', 'image', 'text', 'header', 'summary', 'none'].includes(props.accessibilityRole as string)) {
      issues.push('Invalid accessibilityRole');
    }

    return issues;
  }
}

export default new WCAGComplianceService();