import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

    const toggleItem = (title: string) => {
        setOpenItems((prev) => ({
            ...prev,
            [title]: !prev[title],
        }));
    };

    // Check if any sub-item is active to auto-expand
    const checkSubItemActive = (item: NavItem) => {
        if (!item.items) return false;
        return item.items.some((subItem) => {
            const subItemHref = subItem.href ? (typeof subItem.href === 'string' ? subItem.href : subItem.href.url || '') : '';
            return subItemHref ? page.url.startsWith(subItemHref) : false;
        });
    };

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const isOpen = openItems[item.title] ?? checkSubItemActive(item);

                    return (
                        <SidebarMenuItem key={item.title}>
                            {item.items && item.items.length > 0 ? (
                                <Collapsible open={isOpen} onOpenChange={() => toggleItem(item.title)}>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton tooltip={{ children: item.title }}>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                            <ChevronDown className={`ml-auto transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {item.items.map((subItem) => {
                                                const subItemHref = subItem.href
                                                    ? typeof subItem.href === 'string'
                                                        ? subItem.href
                                                        : subItem.href.url || ''
                                                    : '';
                                                const isSubItemActive = subItemHref ? page.url.startsWith(subItemHref) : false;

                                                return (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton asChild isActive={isSubItemActive}>
                                                            <Link href={subItem.href || '#'} prefetch={true}>
                                                                {subItem.icon && <subItem.icon />}
                                                                <span>{subItem.title}</span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                );
                                            })}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </Collapsible>
                            ) : (
                                <SidebarMenuButton
                                    asChild
                                    isActive={(() => {
                                        if (!item.href) return false;

                                        // Get URL from href (could be string or RouteDefinition object)
                                        let itemHref: string = '';
                                        if (typeof item.href === 'string') {
                                            itemHref = item.href;
                                        } else if (item.href && typeof item.href === 'object' && 'url' in item.href) {
                                            itemHref = (item.href as { url?: string }).url || '';
                                        }

                                        if (!itemHref) return false;

                                        // Normalize URLs (remove trailing slash for comparison)
                                        const normalizedItemHref = itemHref.replace(/\/$/, '');
                                        const normalizedPageUrl = page.url.replace(/\/$/, '');

                                        // For Dashboard, use exact match
                                        if (normalizedItemHref === '/dashboard') {
                                            return normalizedPageUrl === '/dashboard';
                                        }

                                        // For other items, use startsWith
                                        return normalizedPageUrl.startsWith(normalizedItemHref);
                                    })()}
                                    tooltip={{ children: item.title }}
                                >
                                    <Link href={item.href || '#'} prefetch={true}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
