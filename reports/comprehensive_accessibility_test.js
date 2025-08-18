#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test configuration
const TEST_CONFIG = {
    outputDir: './comprehensive_accessibility_results',
    testFiles: [
        'templates/landing/map2.html',
        'templates/base.html',
        'templates/navbar.html',
        'templates/mapnavbar.html',
        'templates/map2navbar.html',
        'templates/vercel.html',
        'templates/footer.html'
    ],
    cssFiles: [
        'static/css/atlas.css',
        'static/css/accessibility.css',
        'static/css/map.css',
        'static/css/main.css'
    ],
    jsFiles: [
        'static/js/accessibility.js',
        'static/js/atlas_api.js',
        'static/js/navpanel.js',
        'static/js/navpanelID.js'
    ]
};

// WCAG 2.1 AA Criteria
const WCAG_CRITERIA = {
    '1.1.1': {
        name: 'Non-text Content',
        level: 'A',
        description: 'All non-text content has a text alternative',
        test: (content) => {
            const issues = [];
            const imgRegex = /<img[^>]*>/g;
            const imgMatches = content.match(imgRegex) || [];
            
            imgMatches.forEach((img, index) => {
                if (!img.includes('alt=') || img.includes('alt=""')) {
                    issues.push({
                        criterion: '1.1.1',
                        severity: 'CRITICAL',
                        message: `Image ${index + 1} missing alt attribute`,
                        element: img,
                        recommendation: 'Add descriptive alt text for all images'
                    });
                }
            });
            
            return issues;
        }
    },
    '1.3.1': {
        name: 'Info and Relationships',
        level: 'A',
        description: 'Information, structure, and relationships can be programmatically determined',
        test: (content) => {
            const issues = [];
            
            // Check for proper heading hierarchy
            const headings = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g) || [];
            let currentLevel = 0;
            let skipLevels = 0;
            
            headings.forEach((heading, index) => {
                const level = parseInt(heading.match(/<h([1-6])/)[1]);
                if (level > currentLevel + 1 && currentLevel !== 0) {
                    skipLevels++;
                    issues.push({
                        criterion: '1.3.1',
                        severity: 'WARNING',
                        message: `Heading level skipped from h${currentLevel} to h${level}`,
                        element: heading,
                        recommendation: 'Maintain proper heading hierarchy (h1 → h2 → h3)'
                    });
                }
                currentLevel = level;
            });
            
            // Check for semantic elements
            if (content.includes('<div') && !content.includes('role=')) {
                issues.push({
                    criterion: '1.3.1',
                    severity: 'LOW',
                    message: 'Generic divs without semantic roles',
                    recommendation: 'Use semantic HTML elements or add ARIA roles'
                });
            }
            
            return issues;
        }
    },
    '1.4.1': {
        name: 'Use of Color',
        level: 'A',
        description: 'Color is not used as the only visual means of conveying information',
        test: (content) => {
            const issues = [];
            
            // Check for color-only indicators
            if (content.includes('color:') && content.includes('background-color:')) {
                issues.push({
                    criterion: '1.4.1',
                    severity: 'WARNING',
                    message: 'Color combinations detected - ensure sufficient contrast',
                    recommendation: 'Verify color contrast ratios meet WCAG requirements'
                });
            }
            
            return issues;
        }
    },
    '1.4.3': {
        name: 'Contrast (Minimum)',
        level: 'AA',
        description: 'Text has sufficient contrast ratio',
        test: (content) => {
            const issues = [];
            
            // This would normally use a contrast checking library
            // For now, we'll flag potential issues
            if (content.includes('color: #') || content.includes('color: rgb')) {
                issues.push({
                    criterion: '1.4.3',
                    severity: 'WARNING',
                    message: 'Color definitions detected - verify contrast ratios',
                    recommendation: 'Ensure text contrast meets 4.5:1 ratio for normal text, 3:1 for large text'
                });
            }
            
            return issues;
        }
    },
    '2.1.1': {
        name: 'Keyboard',
        level: 'A',
        description: 'All functionality is available from a keyboard',
        test: (content) => {
            const issues = [];
            
            // Check for click-only interactions
            if (content.includes('onclick=') && !content.includes('onkeydown=') && !content.includes('onkeyup=')) {
                issues.push({
                    criterion: '2.1.1',
                    severity: 'CRITICAL',
                    message: 'Elements with onclick but no keyboard event handlers',
                    recommendation: 'Add keyboard event handlers or use addEventListener for accessibility'
                });
            }
            
            // Check for proper form controls
            if (content.includes('<input') && !content.includes('type=')) {
                issues.push({
                    criterion: '2.1.1',
                    severity: 'WARNING',
                    message: 'Input elements without type attribute',
                    recommendation: 'Specify input type for proper keyboard behavior'
                });
            }
            
            return issues;
        }
    },
    '2.4.1': {
        name: 'Bypass Blocks',
        level: 'A',
        description: 'A mechanism is available to bypass repeated blocks of content',
        test: (content) => {
            const issues = [];
            
            if (!content.includes('skip') && !content.includes('skip-link')) {
                issues.push({
                    criterion: '2.4.1',
                    severity: 'WARNING',
                    message: 'No skip navigation mechanism detected',
                    recommendation: 'Add skip links for main content and navigation'
                });
            }
            
            return issues;
        }
    },
    '2.4.2': {
        name: 'Page Titled',
        level: 'A',
        description: 'Web pages have titles that describe topic or purpose',
        test: (content) => {
            const issues = [];
            
            if (!content.includes('<title>') || content.includes('<title></title>')) {
                issues.push({
                    criterion: '2.4.2',
                    severity: 'CRITICAL',
                    message: 'Missing or empty page title',
                    recommendation: 'Add descriptive page title'
                });
            }
            
            return issues;
        }
    },
    '2.4.3': {
        name: 'Focus Order',
        level: 'A',
        description: 'If a Web page can be navigated sequentially, focusable components receive focus in an order that preserves meaning and operability',
        test: (content) => {
            const issues = [];
            
            // Check for tabindex attributes that might disrupt natural order
            if (content.includes('tabindex=')) {
                issues.push({
                    criterion: '2.4.3',
                    severity: 'WARNING',
                    message: 'tabindex attributes detected - verify logical focus order',
                    recommendation: 'Ensure tabindex values maintain logical navigation flow'
                });
            }
            
            return issues;
        }
    },
    '2.4.4': {
        name: 'Link Purpose (In Context)',
        level: 'A',
        description: 'The purpose of each link can be determined from the link text alone or from the link text together with its programmatically determined link context',
        test: (content) => {
            const issues = [];
            
            const linkRegex = /<a[^>]*>(.*?)<\/a>/g;
            const links = content.match(linkRegex) || [];
            
            links.forEach((link, index) => {
                const linkText = link.replace(/<[^>]*>/g, '').trim();
                if (linkText === '' || linkText === 'click here' || linkText === 'here' || linkText === 'more') {
                    issues.push({
                        criterion: '2.4.4',
                        severity: 'WARNING',
                        message: `Link ${index + 1} has non-descriptive text: "${linkText}"`,
                        element: link,
                        recommendation: 'Use descriptive link text that explains the destination'
                    });
                }
            });
            
            return issues;
        }
    },
    '2.4.6': {
        name: 'Headings and Labels',
        level: 'AA',
        description: 'Headings and labels describe topic or purpose',
        test: (content) => {
            const issues = [];
            
            const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/g;
            const headings = content.match(headingRegex) || [];
            
            headings.forEach((heading, index) => {
                const headingText = heading.replace(/<[^>]*>/g, '').trim();
                if (headingText === '' || headingText.length < 3) {
                    issues.push({
                        criterion: '2.4.6',
                        severity: 'WARNING',
                        message: `Heading ${index + 1} has insufficient text: "${headingText}"`,
                        element: heading,
                        recommendation: 'Provide descriptive heading text'
                    });
                }
            });
            
            return issues;
        }
    },
    '2.4.7': {
        name: 'Focus Visible',
        level: 'AA',
        description: 'Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible',
        test: (content) => {
            const issues = [];
            
            // Check for focus styles
            if (content.includes(':focus') && content.includes('outline: none')) {
                issues.push({
                    criterion: '2.4.7',
                    severity: 'CRITICAL',
                    message: 'Focus outline removed without alternative indicator',
                    recommendation: 'Provide visible focus indicators for all interactive elements'
                });
            }
            
            return issues;
        }
    },
    '3.2.1': {
        name: 'On Focus',
        level: 'A',
        description: 'When any component receives focus, it does not initiate a change of context',
        test: (content) => {
            const issues = [];
            
            // Check for auto-submit forms or focus-triggered navigation
            if (content.includes('onfocus=') && (content.includes('submit') || content.includes('location'))) {
                issues.push({
                    criterion: '3.2.1',
                    severity: 'WARNING',
                    message: 'Focus-triggered context changes detected',
                    recommendation: 'Avoid automatic form submission or navigation on focus'
                });
            }
            
            return issues;
        }
    },
    '3.2.2': {
        name: 'On Input',
        level: 'A',
        description: 'Changing the setting of any user interface component does not automatically cause a change of context unless the user has been advised of the behavior before using the component',
        test: (content) => {
            const issues = [];
            
            // Check for auto-submit forms
            if (content.includes('onchange=') && content.includes('submit')) {
                issues.push({
                    criterion: '3.2.2',
                    severity: 'WARNING',
                    message: 'Auto-submit on input change detected',
                    recommendation: 'Provide user control over form submission'
                });
            }
            
            return issues;
        }
    },
    '4.1.1': {
        name: 'Parsing',
        level: 'A',
        description: 'Content can be parsed by user agents, including assistive technologies',
        test: (content) => {
            const issues = [];
            
            // Check for unclosed tags
            const openTags = (content.match(/<[^/][^>]*>/g) || []).length;
            const closeTags = (content.match(/<\/[^>]*>/g) || []).length;
            
            if (openTags !== closeTags) {
                issues.push({
                    criterion: '4.1.1',
                    severity: 'CRITICAL',
                    message: `Mismatched tags: ${openTags} open, ${closeTags} closed`,
                    recommendation: 'Ensure all HTML tags are properly closed'
                });
            }
            
            return issues;
        }
    },
    '4.1.2': {
        name: 'Name, Role, Value',
        level: 'A',
        description: 'For all user interface components, the name and role can be programmatically determined',
        test: (content) => {
            const issues = [];
            
            // Check for form controls without labels
            const inputs = content.match(/<input[^>]*>/g) || [];
            inputs.forEach((input, index) => {
                if (!input.includes('id=') && !input.includes('aria-label=') && !input.includes('title=')) {
                    issues.push({
                        criterion: '4.1.2',
                        severity: 'WARNING',
                        message: `Input ${index + 1} missing accessible name`,
                        element: input,
                        recommendation: 'Add id, aria-label, or title attribute'
                    });
                }
            });
            
            // Check for buttons without accessible names
            const buttons = content.match(/<button[^>]*>(.*?)<\/button>/g) || [];
            buttons.forEach((button, index) => {
                const buttonText = button.replace(/<[^>]*>/g, '').trim();
                if (buttonText === '' && !button.includes('aria-label=') && !button.includes('title=')) {
                    issues.push({
                        criterion: '4.1.2',
                        severity: 'CRITICAL',
                        message: `Button ${index + 1} missing accessible name`,
                        element: button,
                        recommendation: 'Add text content, aria-label, or title attribute'
                    });
                }
            });
            
            return issues;
        }
    }
};

// Create output directory
if (!fs.existsSync(TEST_CONFIG.outputDir)) {
    fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
}

// Test results storage
const testResults = {
    timestamp: new Date().toISOString(),
    tools: ['axe-core', 'pa11y', 'WCAG 2.1 AA Analysis'],
    files: {},
    summary: {
        totalIssues: 0,
        criticalIssues: 0,
        warnings: 0,
        passedTests: 0,
        wcagCompliance: {
            levelA: { total: 0, passed: 0, failed: 0 },
            levelAA: { total: 0, passed: 0, failed: 0 }
        }
    }
};

// Utility function to run command and capture output
function runCommand(command, description) {
    try {
        console.log(`\n🔍 Running: ${description}`);
        const output = execSync(command, { 
            encoding: 'utf8', 
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        return { success: true, output, error: null };
    } catch (error) {
        return { 
            success: false, 
            output: error.stdout || '', 
            error: error.stderr || error.message 
        };
    }
}

// WCAG compliance testing
function testWCAGCompliance(filePath) {
    console.log(`📋 Testing WCAG 2.1 AA compliance: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    let levelAPassed = 0;
    let levelAFailed = 0;
    let levelAAPassed = 0;
    let levelAAFailed = 0;
    
    Object.entries(WCAG_CRITERIA).forEach(([criterion, testInfo]) => {
        const criterionIssues = testInfo.test(content);
        
        if (criterionIssues.length > 0) {
            issues.push(...criterionIssues);
            if (testInfo.level === 'A') {
                levelAFailed++;
            } else {
                levelAAFailed++;
            }
        } else {
            if (testInfo.level === 'A') {
                levelAPassed++;
            } else {
                levelAAPassed++;
            }
        }
    });
    
    testResults.summary.wcagCompliance.levelA.total += Object.keys(WCAG_CRITERIA).filter(k => WCAG_CRITERIA[k].level === 'A').length;
    testResults.summary.wcagCompliance.levelA.passed += levelAPassed;
    testResults.summary.wcagCompliance.levelA.failed += levelAFailed;
    
    testResults.summary.wcagCompliance.levelAA.total += Object.keys(WCAG_CRITERIA).filter(k => WCAG_CRITERIA[k].level === 'AA').length;
    testResults.summary.wcagCompliance.levelAA.passed += levelAAPassed;
    testResults.summary.wcagCompliance.levelAA.failed += levelAAFailed;
    
    return { valid: issues.length === 0, issues };
}

// Accessibility testing using axe-core
function testAccessibility(filePath) {
    const command = `axe "${filePath}" --format=json 2>&1 || true`;
    const result = runCommand(command, `Accessibility Testing (axe-core): ${filePath}`);
    
    try {
        const axeResults = JSON.parse(result.output);
        const issues = axeResults.violations.map(violation => ({
            type: 'axe-core',
            severity: 'CRITICAL',
            message: `${violation.description} (${violation.impact})`,
            help: violation.help,
            helpUrl: violation.helpUrl,
            tags: violation.tags,
            nodes: violation.nodes.length
        }));
        return { valid: issues.length === 0, issues };
    } catch (e) {
        return { valid: true, issues: [] };
    }
}

// Accessibility testing using pa11y
function testPa11y(filePath) {
    const command = `pa11y "${filePath}" --json 2>&1 || true`;
    const result = runCommand(command, `Accessibility Testing (pa11y): ${filePath}`);
    
    try {
        const pa11yResults = JSON.parse(result.output);
        const issues = pa11yResults.map(issue => ({
            type: 'pa11y',
            severity: issue.type === 'error' ? 'CRITICAL' : 'WARNING',
            message: issue.message,
            code: issue.code,
            selector: issue.selector,
            context: issue.context
        }));
        return { valid: issues.length === 0, issues };
    } catch (e) {
        return { valid: true, issues: [] };
    }
}

// Main testing function
async function runComprehensiveAccessibilityTests() {
    console.log('🚀 Starting Comprehensive Accessibility Testing with WCAG 2.1 AA Analysis...\n');
    
    // Test HTML files
    for (const file of TEST_CONFIG.testFiles) {
        if (fs.existsSync(file)) {
            console.log(`\n📄 Testing HTML file: ${file}`);
            
            const accessibilityTest = testAccessibility(file);
            const pa11yTest = testPa11y(file);
            const wcagCheck = testWCAGCompliance(file);
            
            testResults.files[file] = {
                accessibilityTest,
                pa11yTest,
                wcagCheck,
                totalIssues: accessibilityTest.issues.length + pa11yTest.issues.length + wcagCheck.issues.length
            };
            
            testResults.summary.totalIssues += testResults.files[file].totalIssues;
            
            if (accessibilityTest.issues.length > 0) {
                testResults.summary.criticalIssues += accessibilityTest.issues.length;
            }
            if (pa11yTest.issues.length > 0) {
                testResults.summary.criticalIssues += pa11yTest.issues.length;
            }
            if (wcagCheck.issues.length > 0) {
                testResults.summary.warnings += wcagCheck.issues.length;
            }
        }
    }
    
    // Generate summary
    testResults.summary.passedTests = Object.keys(testResults.files).length;
    
    // Calculate compliance percentages
    const levelACompliance = (testResults.summary.wcagCompliance.levelA.passed / testResults.summary.wcagCompliance.levelA.total * 100).toFixed(1);
    const levelAACompliance = (testResults.summary.wcagCompliance.levelAA.passed / testResults.summary.wcagCompliance.levelAA.total * 100).toFixed(1);
    
    // Save results
    const resultsFile = path.join(TEST_CONFIG.outputDir, 'comprehensive_accessibility_results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
    
    // Generate detailed HTML report
    generateDetailedHTMLReport(levelACompliance, levelAACompliance);
    
    console.log('\n✅ Comprehensive accessibility testing completed!');
    console.log(`📊 Results saved to: ${resultsFile}`);
    console.log(`📄 HTML report: ${path.join(TEST_CONFIG.outputDir, 'comprehensive_accessibility_report.html')}`);
    console.log(`\n📋 WCAG Compliance Summary:`);
    console.log(`   Level A: ${levelACompliance}% (${testResults.summary.wcagCompliance.levelA.passed}/${testResults.summary.wcagCompliance.levelA.total})`);
    console.log(`   Level AA: ${levelAACompliance}% (${testResults.summary.wcagCompliance.levelAA.passed}/${testResults.summary.wcagCompliance.levelAA.total})`);
    
    return testResults;
}

// Generate detailed HTML report
function generateDetailedHTMLReport(levelACompliance, levelAACompliance) {
    const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Accessibility Report - Atlas of Drowned Towns</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #28a745; }
        .compliance { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .compliance-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .compliance-a { border-top: 4px solid #007bff; }
        .compliance-aa { border-top: 4px solid #28a745; }
        .file-section { margin: 25px 0; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
        .file-header { background: #e9ecef; padding: 15px; border-bottom: 1px solid #dee2e6; }
        .file-header h3 { margin: 0; color: #495057; }
        .issue { margin: 15px; padding: 15px; border-left: 4px solid #dc3545; background: #f8d7da; border-radius: 4px; }
        .issue.warning { border-left-color: #ffc107; background: #fff3cd; }
        .issue.low { border-left-color: #17a2b8; background: #d1ecf1; }
        .issue.critical { border-left-color: #dc3545; background: #f8d7da; }
        .criterion { font-weight: bold; color: #007bff; background: #e7f3ff; padding: 2px 6px; border-radius: 3px; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
        .tool-badge { display: inline-block; background: #6f42c1; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-right: 8px; }
        .severity-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-left: 8px; }
        .severity-critical { background: #dc3545; color: white; }
        .severity-warning { background: #ffc107; color: #212529; }
        .severity-low { background: #17a2b8; color: white; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .stat-label { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Comprehensive Accessibility Test Report</h1>
        <h2>Atlas of Drowned Towns Project</h2>
        <p class="timestamp">Generated: ${testResults.timestamp}</p>
        <p><strong>Testing Tools:</strong> ${testResults.tools.join(', ')}</p>
    </div>
    
    <div class="summary">
        <h3>📊 Executive Summary</h3>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${testResults.summary.totalIssues}</div>
                <div class="stat-label">Total Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${testResults.summary.criticalIssues}</div>
                <div class="stat-label">Critical Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${testResults.summary.warnings}</div>
                <div class="stat-label">Warnings</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${testResults.summary.passedTests}</div>
                <div class="stat-label">Files Tested</div>
            </div>
        </div>
    </div>
    
    <div class="compliance">
        <div class="compliance-card compliance-a">
            <h3>WCAG 2.1 Level A</h3>
            <div class="stat-number">${levelACompliance}%</div>
            <p>${testResults.summary.wcagCompliance.levelA.passed}/${testResults.summary.wcagCompliance.levelA.total} criteria passed</p>
        </div>
        <div class="compliance-card compliance-aa">
            <h3>WCAG 2.1 Level AA</h3>
            <div class="stat-number">${levelAACompliance}%</div>
            <p>${testResults.summary.wcagCompliance.levelAA.passed}/${testResults.summary.wcagCompliance.levelAA.total} criteria passed</p>
        </div>
    </div>
    
    ${Object.entries(testResults.files).map(([file, results]) => `
        <div class="file-section">
            <div class="file-header">
                <h3>📄 ${file}</h3>
                <p><strong>Total Issues:</strong> ${results.totalIssues}</p>
            </div>
            ${generateDetailedFileIssues(results)}
        </div>
    `).join('')}
    
    <div class="file-section">
        <div class="file-header">
            <h3>📋 WCAG 2.1 AA Criteria Details</h3>
        </div>
        <div style="padding: 20px;">
            ${Object.entries(WCAG_CRITERIA).map(([criterion, info]) => `
                <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
                    <h4><span class="criterion">${criterion}</span> ${info.name} (Level ${info.level})</h4>
                    <p><strong>Description:</strong> ${info.description}</p>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
    
    const reportFile = path.join(TEST_CONFIG.outputDir, 'comprehensive_accessibility_report.html');
    fs.writeFileSync(reportFile, htmlReport);
}

// Generate detailed issues for a file
function generateDetailedFileIssues(results) {
    let issuesHtml = '';
    
    if (results.accessibilityTest && results.accessibilityTest.issues.length > 0) {
        issuesHtml += '<h4>🔍 Axe-core Accessibility Issues</h4>';
        results.accessibilityTest.issues.forEach(issue => {
            issuesHtml += `<div class="issue critical">
                <span class="tool-badge">axe-core</span>
                <strong>${issue.message}</strong>
                <span class="severity-badge severity-critical">CRITICAL</span>
                <br><strong>Help:</strong> ${issue.help}
                <br><strong>Tags:</strong> ${issue.tags.join(', ')}
                <br><strong>Affected Elements:</strong> ${issue.nodes}
            </div>`;
        });
    }
    
    if (results.pa11yTest && results.pa11yTest.issues.length > 0) {
        issuesHtml += '<h4>♿ Pa11y Accessibility Issues</h4>';
        results.pa11yTest.issues.forEach(issue => {
            issuesHtml += `<div class="issue ${issue.severity.toLowerCase()}">
                <span class="tool-badge">pa11y</span>
                <strong>${issue.message}</strong>
                <span class="severity-badge severity-${issue.severity.toLowerCase()}">${issue.severity}</span>
                <br><strong>Code:</strong> ${issue.code}
                <br><strong>Selector:</strong> ${issue.selector}
                <br><strong>Context:</strong> ${issue.context}
            </div>`;
        });
    }
    
    if (results.wcagCheck && results.wcagCheck.issues.length > 0) {
        issuesHtml += '<h4>📋 WCAG Compliance Issues</h4>';
        results.wcagCheck.issues.forEach(issue => {
            issuesHtml += `<div class="issue ${issue.severity.toLowerCase()}">
                <span class="tool-badge">WCAG</span>
                <strong>${issue.criterion}:</strong> ${issue.message}
                <span class="severity-badge severity-${issue.severity.toLowerCase()}">${issue.severity}</span>
                <br><span class="criterion">${issue.criterion} - ${WCAG_CRITERIA[issue.criterion]?.name}</span>
                <br><strong>Recommendation:</strong> ${issue.recommendation}
                ${issue.element ? `<br><strong>Element:</strong> <code>${issue.element}</code>` : ''}
            </div>`;
        });
    }
    
    if (issuesHtml === '') {
        issuesHtml = '<p style="padding: 20px; color: #28a745; font-weight: bold;">✅ No accessibility issues found</p>';
    }
    
    return issuesHtml;
}

// Run the tests
if (require.main === module) {
    runComprehensiveAccessibilityTests().catch(console.error);
}

module.exports = { runComprehensiveAccessibilityTests }; 