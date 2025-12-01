/**
 * Manifest validation script for Lazy Me Extension
 * Validates the manifest.json file for common issues
 */

const fs = require('fs');
const path = require('path');

function validateManifest() {
    const manifestPath = path.join(__dirname, '..', 'manifest.json');
    
    try {
        // Check if manifest exists
        if (!fs.existsSync(manifestPath)) {
            console.error('manifest.json not found');
            process.exit(1);
        }

        // Read and parse manifest
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);

        console.log('🔍 Validating manifest.json...');

        // Required fields
        const requiredFields = [
            'manifest_version',
            'name',
            'version',
            'description',
            'permissions',
            'action'
        ];

        const missingFields = requiredFields.filter(field => !manifest[field]);
        
        if (missingFields.length > 0) {
            console.error(`Missing required fields: ${missingFields.join(', ')}`);
            process.exit(1);
        }

        // Validate manifest version
        if (manifest.manifest_version !== 3) {
            console.error('manifest_version must be 3');
            process.exit(1);
        }

        // Validate permissions
        const requiredPermissions = ['activeTab', 'storage', 'downloads'];
        const missingPermissions = requiredPermissions.filter(perm =>
            !manifest.permissions.includes(perm)
        );

        if (missingPermissions.length > 0) {
            console.error(`Missing required permissions: ${missingPermissions.join(', ')}`);
            process.exit(1);
        }

        // Validate action
        if (!manifest.action.default_popup) {
            console.error('action.default_popup is required');
            process.exit(1);
        }

        // Check if popup file exists
        const popupPath = path.join(__dirname, '..', manifest.action.default_popup);
        if (!fs.existsSync(popupPath)) {
            console.error(`Popup file not found: ${manifest.action.default_popup}`);
            process.exit(1);
        }

        // Check if background script exists
        if (manifest.background && manifest.background.service_worker) {
            const backgroundPath = path.join(__dirname, '..', manifest.background.service_worker);
            if (!fs.existsSync(backgroundPath)) {
                console.error(`Background script not found: ${manifest.background.service_worker}`);
                process.exit(1);
            }
        }

        // Check if content scripts exist
        if (manifest.content_scripts) {
            manifest.content_scripts.forEach((script, index) => {
                script.js.forEach(jsFile => {
                    const jsPath = path.join(__dirname, '..', jsFile);
                    if (!fs.existsSync(jsPath)) {
                        console.error(`Content script not found: ${jsFile}`);
                        process.exit(1);
                    }
                });
            });
        }

        // Check if icons exist
        if (manifest.icons) {
            Object.values(manifest.icons).forEach(iconPath => {
                const fullIconPath = path.join(__dirname, '..', iconPath);
                if (!fs.existsSync(fullIconPath)) {
                    console.warn(`⚠️  Icon not found: ${iconPath}`);
                }
            });
        }

        console.log('Manifest validation passed!');
        console.log(`Extension: ${manifest.name} v${manifest.version}`);
        console.log(`Manifest version: ${manifest.manifest_version}`);
        console.log(`Description: ${manifest.description}`);

    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('Invalid JSON in manifest.json');
            console.error(error.message);
        } else {
            console.error('Error validating manifest:', error.message);
        }
        process.exit(1);
    }
}

// Run validation
validateManifest();
