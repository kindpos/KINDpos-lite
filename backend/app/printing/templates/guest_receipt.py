from typing import List, Dict, Any
from .base_template import BaseTemplate
from .half_placement_utils import has_half_modifiers, get_half_modifiers
from app.core.money import money_round

class GuestReceiptTemplate(BaseTemplate):
    """
    Template for Guest Receipts.
    Financial document: Trustworthy, professional, complete.
    Three copy types: Customer, Merchant, Itemized.
    """

    def render(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        commands = super().render(context)
        
        # 1. Header
        commands.append({'type': 'text', 'content': context.get('restaurant_name', 'KINDpos'), 'bold': True, 'align': 'center'})
        commands.append({'type': 'text', 'content': context.get('address', ''), 'align': 'center'})
        commands.append({'type': 'text', 'content': context.get('phone', ''), 'align': 'center'})
        commands.append({'type': 'feed', 'lines': 1})
        
        # 2. Order Info
        copy_type_label = context.get('copy_type', 'customer').replace('_', ' ').upper()
        commands.append({'type': 'text', 'content': f"** {copy_type_label} COPY **", 'bold': True, 'align': 'center'})
        commands.append({'type': 'feed', 'lines': 1})
        
        commands.append({'type': 'text', 'content': f"Ticket: {context.get('ticket_number', 'N/A')} | {context.get('order_type', '').upper()}", 'bold': True})
        if context.get('table'):
            commands.append({'type': 'text', 'content': f"Table: {context.get('table')} | Server: {context.get('server_name', 'N/A')}"})
        else:
            commands.append({'type': 'text', 'content': f"Server: {context.get('server_name', 'N/A')}"})

        if context.get('customer_name'):
            commands.append({'type': 'text', 'content': f"Name: {context['customer_name']}", 'bold': True})

        closed_at = self._format_datetime(context.get('closed_at'))
        opened_at = self._format_datetime(context.get('opened_at'))
        commands.append({'type': 'text', 'content': f"Date: {closed_at if closed_at != 'N/A' else opened_at}"})
        commands.append({'type': 'divider'})
        
        # 3. Items (Financial)
        for item in context.get('items', []):
            qty = item.get('qty', 1)
            name = item.get('name', 'Item')
            price = item.get('price', 0.0)
            total = qty * price
            
            # Line format: QTY NAME PRICE
            line = f"{qty} {name[:self.chars_per_line-15]:<{self.chars_per_line-15}} ${total:>7.2f}"
            commands.append({'type': 'text', 'content': line, 'bold': True})
            
            # Modifiers — half-placement split or flat
            item_mods = item.get('modifiers', [])
            if has_half_modifiers(item_mods):
                commands.extend(self._render_half_placement_items(item_mods))
            else:
                for mod in item_mods:
                    commands.append({'type': 'text', 'content': f"  + {mod}"})
                
        commands.append({'type': 'divider'})
        
        # 4. Totals
        subtotal = context.get('subtotal', 0.0)
        commands.append({'type': 'text', 'content': f"{'SUBTOTAL:':<{self.chars_per_line-10}} ${subtotal:>8.2f}"})

        # Discount line (if any discounts applied)
        discount_total = context.get('discount_total', 0.0)
        if discount_total > 0:
            commands.append({'type': 'text', 'content': f"{'DISCOUNT:':<{self.chars_per_line-10}} -${discount_total:>7.2f}"})

        for tax in context.get('tax_lines', []):
            label = tax.get('label', 'Tax')
            amt = tax.get('amount', 0.0)
            commands.append({'type': 'text', 'content': f"{label + ':':<{self.chars_per_line-10}} ${amt:>8.2f}"})

        total = context.get('total', 0.0)
        commands.append({'type': 'text', 'content': f"{'TOTAL:':<{self.chars_per_line-10}} ${total:>8.2f}", 'bold': True})
        
        # 5. Payment Info
        if context.get('payment_method') == 'card':
            last_four = context.get('card_last_four', '****')
            commands.append({'type': 'feed', 'lines': 1})
            commands.append({'type': 'text', 'content': f"Card: **** **** **** {last_four}"})
            
            # Tip section (Spec Update)
            commands.extend(self._render_tip_section(context))
                
        # 6. Footer
        commands.append({'type': 'feed', 'lines': 2})
        footer = context.get('footer_message', 'Thank you! Please come again.')
        wrapped_footer = self._wrap_text(footer, self.chars_per_line)
        for line in wrapped_footer:
            commands.append({'type': 'text', 'content': line, 'align': 'center'})
            
        commands.append({'type': 'feed', 'lines': 3})
        commands.append({'type': 'cut', 'partial': True})
        return commands

    def _render_half_placement_items(self, modifiers: list) -> list:
        """Render split-column layout for half-placement modifiers with prices."""
        cmds = []
        whole_mods, left_mods, right_mods = get_half_modifiers(modifiers)

        # Whole modifiers above the table (flat, with prices)
        for wm in whole_mods:
            price = wm['display_price']
            if price:
                cmds.append({'type': 'text', 'content': f"  + {wm['name']:<{self.chars_per_line - 12}} ${price:>6.2f}"})
            else:
                cmds.append({'type': 'text', 'content': f"  + {wm['name']}"})

        # Split-column table
        col_w = (self.chars_per_line - 1) // 2
        right_w = self.chars_per_line - col_w - 1
        divider_line = '-' * col_w + '+' + '-' * right_w

        cmds.append({'type': 'text', 'content': divider_line})
        cmds.append({'type': 'text', 'content':
            f"{'LEFT':<{col_w}}|{'RIGHT':<{right_w}}", 'bold': True})
        cmds.append({'type': 'text', 'content': divider_line})

        max_rows = max(len(left_mods), len(right_mods), 1) if (left_mods or right_mods) else 0
        for row in range(max_rows):
            left_text = self._format_half_col(left_mods[row], col_w) if row < len(left_mods) else ' ' * col_w
            right_text = self._format_half_col(right_mods[row], right_w) if row < len(right_mods) else ' ' * right_w
            cmds.append({'type': 'text', 'content': f"{left_text}|{right_text}"})

        cmds.append({'type': 'text', 'content': divider_line})
        return cmds

    def _format_half_col(self, mod: dict, width: int) -> str:
        """Format a single half-placement modifier entry within a column."""
        name = mod['display_name']
        price = mod['display_price']

        if price:
            price_str = f"${price:.2f}"
            # name + space + price must fit in width (with 1-char left pad)
            max_name = width - len(price_str) - 2  # 1 pad + name + 1 space + price
            if len(name) > max_name:
                name = name[:max_name - 1] + '\u2026'
            return f" {name:<{width - len(price_str) - 1}}{price_str}"
        else:
            if len(name) > width - 1:
                name = name[:width - 2] + '\u2026'
            return f" {name:<{width - 1}}"

    def _render_tip_section(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Render the tip section with optional suggestions."""
        commands = []
        copy_type = context.get('copy_type', 'customer')
        order_type = context.get('order_type', '')
        
        # Suggested tip block: Customer Copy + (Dine-in or Bar Tab)
        if copy_type == 'customer' and order_type in ['dine_in', 'bar_tab']:
            commands.append({'type': 'divider'})
            commands.append({'type': 'text', 'content': "TIP SUGGESTIONS:", 'bold': True})
            
            # Get config
            percentages = context.get('tip_suggestion_percentages', [15, 18, 20])
            calc_base = context.get('tip_calculation_base', 'pretax')
            
            # Base amount for calculation
            base_amount = context.get('subtotal', 0.0) if calc_base == 'pretax' else context.get('total', 0.0)
            
            for pct in percentages:
                amount = money_round(base_amount * (pct / 100))
                commands.append({'type': 'text', 'content': f"  {pct}%{' ' * 7}${amount:>7.2f}"})
            
            commands.append({'type': 'feed', 'lines': 1})
            
            # Specific format for suggestions block
            commands.append({'type': 'text', 'content': f"{'TIP:':<{self.chars_per_line-20}} _________________"})
            commands.append({'type': 'feed', 'lines': 1})
            commands.append({'type': 'text', 'content': f"{'TOTAL:':<{self.chars_per_line-20}} _________________"})
            commands.append({'type': 'feed', 'lines': 1})
            commands.append({'type': 'text', 'content': f"{'SIGNATURE:':<{self.chars_per_line-20}} _________________"})
            commands.append({'type': 'divider'})
        else:
            # Merchant and itemized copies (or non-dine-in/bar-tab) show a simple TIP: ____ line
            commands.append({'type': 'feed', 'lines': 1})
            commands.append({'type': 'text', 'content': f"{'TIP:':<{self.chars_per_line-20}} _________________"})
            
            # If it's a card transaction on Merchant Copy, we still need total and signature
            if copy_type == 'merchant':
                commands.append({'type': 'feed', 'lines': 1})
                commands.append({'type': 'text', 'content': f"{'TOTAL:':<{self.chars_per_line-20}} _________________"})
                commands.append({'type': 'feed', 'lines': 1})
                commands.append({'type': 'text', 'content': f"{'SIGNATURE:':<{self.chars_per_line-20}} _________________"})

        return commands
