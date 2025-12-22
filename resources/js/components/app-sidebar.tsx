import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Box,
    Database,
    LayoutGrid,
    Package,
    PackageCheck,
    Presentation,
    ShoppingCart,
    Store,
    UserCog,
} from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;

    const baseNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            icon: LayoutGrid,
            items: [
                {
                    title: 'Dashboard Stock',
                    href: '/dashboard/penjualan',
                    icon: ShoppingCart,
                },
                {
                    title: 'Grafik Presentase',
                    href: '/dashboard/presentation-report',
                    icon: Presentation,
                },
            ],
        },
    ];

    // Menu tambahan berdasarkan role
    const roleBasedNavItems: NavItem[] = [];

    // Assistant Area Manager dapat mengakses semua menu termasuk Stok
    if (user.role === 'Assistant Area Manager' || user.role === 'Field Assistant') {
        roleBasedNavItems.push({
            title: 'Menu Stock',
            icon: Package,
            items: [
                {
                    title: 'Stock Masuk',
                    href: '/dashboard/stok/masuk',
                    icon: ArrowDownCircle,
                },
                {
                    title: 'Stock Keluar',
                    href: '/dashboard/stok/keluar',
                    icon: ArrowUpCircle,
                },
                {
                    title: 'Stock Inventory',
                    href: '/dashboard/stok/tersedia',
                    icon: PackageCheck,
                },
            ],
        });

        // Master Data menu items
        const masterDataItems: NavItem[] = [
            {
                title: 'Data Kios',
                href: '/dashboard/master-data/kios',
                icon: Store,
            },
            {
                title: 'Data Produk',
                href: '/dashboard/master-data/produk',
                icon: Box,
            },
        ];

        // Hanya Assistant Area Manager yang bisa melihat Data Petugas
        if (user.role === 'Assistant Area Manager') {
            masterDataItems.unshift({
                title: 'Data Petugas',
                href: '/dashboard/master-data/petugas',
                icon: UserCog,
            });
        }

        roleBasedNavItems.push({
            title: 'Master Data',
            icon: Database,
            items: masterDataItems,
        });
    }

    const mainNavItems: NavItem[] = [...baseNavItems, ...roleBasedNavItems];
    const footerNavItems: NavItem[] = [];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch={true}>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
