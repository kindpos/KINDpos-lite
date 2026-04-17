/* ============================================
   KINDpos Overseer - Excel Parser Service
   JavaScript port of import_service.py

   Parses KINDpos Excel menu templates using
   SheetJS (XLSX). Runs entirely in the browser
   — no server, no internet, no dependencies.

   Output shape matches the Python parser so
   event generation can work with either source.
   ============================================ */

/**
 * Parse a KINDpos menu template Excel file.
 *
 * @param {File} file - The Excel file from <input type="file">
 * @returns {Promise<{success: boolean, data: object, errors: string[], warnings: string[]}>}
 */
export async function parseMenuTemplate(file) {
    const errors = [];
    const warnings = [];
    const data = {};

    try {
        // Read file as ArrayBuffer
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        // Parse each sheet (same order as Python)
        data.restaurant_info = _parseRestaurantInfo(workbook, errors);
        data.tax_rules       = _parseTaxRules(workbook, errors, warnings);
        data.categories      = _parseCategories(workbook, errors);
        data.modifiers       = _parseModifiers(workbook, warnings);
        data.items           = _parseItems(workbook, errors, warnings);
        data.discounts       = _parseDiscounts(workbook, errors, warnings);

        const success = errors.length === 0;
        return { success, data, errors, warnings };

    } catch (e) {
        errors.push(`Failed to read file: ${e.message}`);
        return { success: false, data: {}, errors, warnings };
    }
}

/* ------------------------------------------
   HELPER: Safe cell value extraction
   Mirrors pd.notna() checks from Python.
------------------------------------------ */
function hasValue(val) {
    return val !== undefined && val !== null && val !== '';
}

function str(val) {
    return hasValue(val) ? String(val).trim() : '';
}

function cleanField(val) {
    return str(val).replace(/\*/g, '').trim();
}

/* ------------------------------------------
   RESTAURANT INFO
   Key-value pairs: Field Name → Value
------------------------------------------ */
function _parseRestaurantInfo(workbook, errors) {
    try {
        const sheet = workbook.Sheets['RESTAURANT INFO'];
        if (!sheet) {
            errors.push('Missing sheet: RESTAURANT INFO');
            return {};
        }

        const rows = XLSX.utils.sheet_to_json(sheet);
        const info = {};

        for (const row of rows) {
            const field = row['Field Name'];
            const value = row['Value'];

            if (hasValue(field) && hasValue(value)) {
                info[cleanField(field)] = str(value);
            }
        }

        // Validate required fields
        const required = ['Restaurant Name', 'Address', 'City', 'State', 'ZIP Code'];
        for (const field of required) {
            if (!info[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        return info;

    } catch (e) {
        errors.push(`Error parsing Restaurant Info: ${e.message}`);
        return {};
    }
}

/* ------------------------------------------
   TAX RULES
------------------------------------------ */
function _parseTaxRules(workbook, errors, warnings) {
    try {
        const sheet = workbook.Sheets['TAX RULES'];
        if (!sheet) {
            errors.push('Missing sheet: TAX RULES');
            return [];
        }

        const rows = XLSX.utils.sheet_to_json(sheet);
        const taxRules = [];

        for (const row of rows) {
            const name = str(row['Tax Name*']);

            // Skip empty rows and example rows
            if (!name || name.toLowerCase().includes('example')) continue;

            taxRules.push({
                name:       name,
                type:       hasValue(row['Tax Type*'])    ? str(row['Tax Type*'])    : 'Sales Tax',
                rate:       hasValue(row['Rate (%)*'])    ? parseFloat(row['Rate (%)*']) : 0.0,
                applies_to: hasValue(row['Applies To*'])  ? str(row['Applies To*'])  : 'All Taxable Items',
                dine_in:    hasValue(row['Dine-In'])      ? str(row['Dine-In']).toUpperCase() === 'Y' : true,
                takeout:    hasValue(row['Takeout'])       ? str(row['Takeout']).toUpperCase() === 'Y' : true,
                delivery:   hasValue(row['Delivery'])      ? str(row['Delivery']).toUpperCase() === 'Y' : true,
                notes:      hasValue(row['Notes'])         ? str(row['Notes']) : '',
            });
        }

        if (taxRules.length === 0) {
            warnings.push('No tax rules defined — will use 0% tax');
        }

        return taxRules;

    } catch (e) {
        errors.push(`Error parsing Tax Rules: ${e.message}`);
        return [];
    }
}

/* ------------------------------------------
   CATEGORIES
------------------------------------------ */
function _parseCategories(workbook, errors) {
    try {
        const sheet = workbook.Sheets['CATEGORIES'];
        if (!sheet) {
            errors.push('Missing sheet: CATEGORIES');
            return [];
        }

        const rows = XLSX.utils.sheet_to_json(sheet);
        const categories = [];

        for (const row of rows) {
            const name = str(row['Category Name*']);
            if (!name) continue;

            categories.push({
                name:           name,
                display_order:  hasValue(row['Display Order*']) ? parseInt(row['Display Order*'], 10) : 999,
                color:          hasValue(row['Color Code'])     ? str(row['Color Code']) : '#CCCCCC',
                tax_category:   hasValue(row['Tax Category*'])  ? str(row['Tax Category*']) : null,
                description:    hasValue(row['Description'])    ? str(row['Description']) : '',
                active:         hasValue(row['Active'])         ? str(row['Active']).toUpperCase() === 'Y' : true,
            });
        }

        if (categories.length === 0) {
            errors.push('No categories defined — at least one category is required');
        }

        // Sort by display order (same as Python)
        categories.sort((a, b) => a.display_order - b.display_order);

        return categories;

    } catch (e) {
        errors.push(`Error parsing Categories: ${e.message}`);
        return [];
    }
}

/* ------------------------------------------
   MODIFIERS (simplified — same as Python)
------------------------------------------ */
function _parseModifiers(workbook, warnings) {
    try {
        const sheet = workbook.Sheets['MODIFIERS'];
        if (!sheet) {
            warnings.push('No MODIFIERS sheet found — skipping');
            return { master_list: [], option_templates: [], groups: [], category_assignments: [] };
        }

        // Simplified parsing — full implementation pending
        warnings.push('Modifier parsing simplified — full implementation pending');

        return {
            master_list: [],
            option_templates: [],
            groups: [],
            category_assignments: [],
        };

    } catch (e) {
        warnings.push(`Could not parse Modifiers sheet: ${e.message}`);
        return { master_list: [], option_templates: [], groups: [], category_assignments: [] };
    }
}

/* ------------------------------------------
   ITEMS
------------------------------------------ */
function _parseItems(workbook, errors, warnings) {
    try {
        const sheet = workbook.Sheets['ITEMS'];
        if (!sheet) {
            errors.push('Missing sheet: ITEMS');
            return [];
        }

        const rows = XLSX.utils.sheet_to_json(sheet);
        const items = [];

        for (const row of rows) {
            const name = str(row['Item Name*']);
            if (!name) continue;

            items.push({
                name:            name,
                category:        hasValue(row['Category*'])       ? str(row['Category*'])       : '',
                price:           hasValue(row['Price*'])          ? parseFloat(row['Price*'])    : 0.0,
                description:     hasValue(row['Description'])     ? str(row['Description'])     : '',
                tax:             hasValue(row['Tax'])             ? str(row['Tax'])             : 'AUTO',
                modifier_groups: hasValue(row['Modifier Groups']) ? str(row['Modifier Groups']) : 'AUTO',
                sku:             hasValue(row['SKU'])             ? str(row['SKU'])             : '',
                active:          hasValue(row['Active'])          ? str(row['Active']).toUpperCase() === 'Y' : true,
                prep_time:       hasValue(row['Prep Time (min)']) ? parseInt(row['Prep Time (min)'], 10) : 0,
                allergens:       hasValue(row['Allergens'])       ? str(row['Allergens'])       : '',
                notes:           hasValue(row['Notes'])           ? str(row['Notes'])           : '',
            });
        }

        if (items.length === 0) {
            warnings.push('No menu items defined');
        }

        return items;

    } catch (e) {
        errors.push(`Error parsing Items: ${e.message}`);
        return [];
    }
}

/* ------------------------------------------
   DISCOUNTS
------------------------------------------ */
function _parseDiscounts(workbook, errors, warnings) {
    try {
        const sheet = workbook.Sheets['DISCOUNTS'];
        if (!sheet) {
            // Discounts are optional
            warnings.push('No DISCOUNTS sheet found — skipping');
            return [];
        }

        const rows = XLSX.utils.sheet_to_json(sheet);
        const discounts = [];

        for (const row of rows) {
            const name = str(row['Discount Name*']);

            // Skip empty rows and example rows
            if (!name || name.toLowerCase().includes('example')) continue;

            discounts.push({
                name:                  name,
                type:                  hasValue(row['Type*'])                ? str(row['Type*'])          : '',
                amount:                hasValue(row['Amount*'])              ? parseFloat(row['Amount*']) : 0.0,
                schedule:              hasValue(row['Schedule'])             ? str(row['Schedule'])       : 'Always',
                applies_to:            hasValue(row['Applies To'])           ? str(row['Applies To'])     : 'Entire Check',
                restrictions:          hasValue(row['Restrictions'])         ? str(row['Restrictions'])   : '',
                requires_approval:     hasValue(row['Requires Approval'])    ? str(row['Requires Approval']).toUpperCase() === 'YES' : false,
                reason_code_required:  hasValue(row['Reason Code Required']) ? str(row['Reason Code Required']).toUpperCase() === 'YES' : false,
                active:                hasValue(row['Active'])               ? str(row['Active']).toUpperCase() === 'YES' : true,
                notes:                 hasValue(row['Notes'])                ? str(row['Notes']) : '',
            });
        }

        return discounts;

    } catch (e) {
        errors.push(`Error parsing Discounts: ${e.message}`);
        return [];
    }
}

/**
 * Get a summary of parsed data.
 * Mirrors ImportService.get_summary() from Python.
 */
export function getSummary(data) {
    return {
        restaurant_name:  (data.restaurant_info || {})['Restaurant Name'] || 'Unknown',
        tax_rules_count:  (data.tax_rules || []).length,
        categories_count: (data.categories || []).length,
        items_count:      (data.items || []).length,
        discounts_count:  (data.discounts || []).length,
    };
}