import { type User } from '@/types';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/authenticated-layout';
import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';

type Props = {
    user: User;
};

type ReportData = {
    date?: string;
    date_label?: string;
    week_number?: number;
    week_start?: string;
    week_end?: string;
    week_label?: string;
    month?: string;
    month_label?: string;
    label: string;
    total_quantity: number;
    total_transactions: number;
    [key: string]: any; // For dynamic kemasan fields (kemasan_1, kemasan_2, etc.)
};

type Product = {
    id: number;
    nama: string;
    kemasan: string;
    satuan: string | null;
};

type Kios = {
    id: number;
    nama: string;
};

type QtyKemasan = {
    id: number;
    qty_kemasan: number;
};

type ApiResponse<T> = {
    success: boolean;
    data: T;
    meta?: any;
    message: string;
};

export default function PresentationReport({ user }: Props) {
    const [reportData, setReportData] = useState<ReportData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filter states
    const [productIds, setProductIds] = useState<string[]>([]);
    const [kiosIds, setKiosIds] = useState<string[]>([]);
    const [kemasanIds, setKemasanIds] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
    // Options for filters
    const [products, setProducts] = useState<Product[]>([]);
    const [kios, setKios] = useState<Kios[]>([]);
    const [kemasan, setKemasan] = useState<QtyKemasan[]>([]);

    // Helper untuk mendapatkan CSRF token
    const getCsrfToken = () => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        return token || '';
    };

    // Fetch products
    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/product', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (response.ok) {
                const result: ApiResponse<Product[]> = await response.json();
                if (result.success) {
                    setProducts(result.data);
                }
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    // Fetch kios
    const fetchKios = async () => {
        try {
            const response = await fetch('/api/kios', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (response.ok) {
                const result: ApiResponse<Kios[]> = await response.json();
                if (result.success) {
                    setKios(result.data);
                }
            }
        } catch (err) {
            console.error('Error fetching kios:', err);
        }
    };

    // Fetch kemasan
    const fetchKemasan = async () => {
        try {
            const response = await fetch('/api/qty-kemasan', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (response.ok) {
                const result: ApiResponse<QtyKemasan[]> = await response.json();
                if (result.success) {
                    setKemasan(result.data);
                }
            }
        } catch (err) {
            console.error('Error fetching kemasan:', err);
        }
    };

    // Fetch report data
    const fetchReportData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            params.append('type', 'penjualan'); // Default to penjualan
            if (productIds.length > 0) {
                productIds.forEach((id) => {
                    params.append('product_id[]', id);
                });
            }
            if (kiosIds.length > 0) {
                kiosIds.forEach((id) => {
                    params.append('kios_id[]', id);
                });
            }
            if (kemasanIds.length > 0) {
                kemasanIds.forEach((id) => {
                    params.append('qty_kemasan_id[]', id);
                });
            }
            if (startDate) {
                params.append('start_date', startDate);
            }
            if (endDate) {
                params.append('end_date', endDate);
            }

            const response = await fetch(`/api/presentation-report?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil data laporan');
            }

            const result: ApiResponse<ReportData[]> = await response.json();
            if (result.success) {
                setReportData(result.data);
            } else {
                throw new Error(result.message || 'Gagal mengambil data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            console.error('Error fetching report data:', err);
        } finally {
            setLoading(false);
        }
    }, [productIds, kiosIds, kemasanIds, startDate, endDate]);

    // Fetch data when filters change
    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    // Fetch products, kios, and kemasan on mount
    useEffect(() => {
        fetchProducts();
        fetchKios();
        fetchKemasan();
    }, []);

    // Format number with thousand separator
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    };

    // Get kemasan IDs from report data (extract from kemasan_X keys)
    const getKemasanIdsFromData = (): string[] => {
        if (reportData.length === 0) return [];
        
        const kemasanKeys = Object.keys(reportData[0]).filter(key => key.startsWith('kemasan_'));
        return kemasanKeys.map(key => key.replace('kemasan_', ''));
    };

    // Get kemasan info by ID
    const getKemasanInfo = (id: string) => {
        return kemasan.find(k => String(k.id) === id);
    };

    // Get product info by ID
    const getProductInfo = (id: string) => {
        return products.find(p => String(p.id) === id);
    };

    // Get product names for selected products
    const getProductNames = (): string => {
        if (productIds.length === 0) return '';
        if (productIds.length === 1) {
            const product = getProductInfo(productIds[0]);
            return product ? product.nama : '';
        }
        // Multiple products
        const names = productIds
            .map(id => {
                const product = getProductInfo(id);
                return product ? product.nama : '';
            })
            .filter(name => name !== '')
            .join(', ');
        return names;
    };

    // Color palette for different kemasan
    const colors = [
        '#3b82f6', // blue
        '#ef4444', // red
        '#10b981', // green
        '#f59e0b', // amber
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#06b6d4', // cyan
        '#84cc16', // lime
        '#f97316', // orange
        '#6366f1', // indigo
    ];

    // Get active kemasan IDs: use filter if selected, otherwise use from data
    const activeKemasanIds = kemasanIds.length > 0 
        ? kemasanIds 
        : getKemasanIdsFromData();

    // Prepare chart data
    const chartData = reportData.map((item) => {
        const data: any = {
            name: item.label,
            quantity: item.total_quantity,
            transactions: item.total_transactions,
        };
        
        // Add kemasan data if available
        activeKemasanIds.forEach((kemasanId) => {
            data[`kemasan_${kemasanId}`] = item[`kemasan_${kemasanId}`] || 0;
        });
        
        return data;
    });

    return (
        <>
            <Head title="Presentation Report" />

            <AuthenticatedLayout>
                <div className="space-y-6 p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Presentation Report</h1>
                            <p className="text-muted-foreground mt-1">
                                Laporan presentasi data penjualan dan stok keluar
                            </p>
                        </div>
                    </div>

                    {/* Filters */}
                    <Card className="p-3 sm:p-4">
                        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            <div>
                                <Label htmlFor="product">Produk (Opsional)</Label>
                                <MultiSelect
                                    id="product"
                                    options={products.map((product) => ({
                                        value: String(product.id),
                                        label: product.nama,
                                    }))}
                                    selected={productIds}
                                    onSelectionChange={setProductIds}
                                    placeholder="Semua Produk"
                                />
                            </div>

                            <div>
                                <Label htmlFor="kios">Kios (Opsional)</Label>
                                <MultiSelect
                                    id="kios"
                                    options={kios.map((k) => ({
                                        value: String(k.id),
                                        label: k.nama,
                                    }))}
                                    selected={kiosIds}
                                    onSelectionChange={setKiosIds}
                                    placeholder="Semua Kios"
                                />
                            </div>

                            <div>
                                <Label htmlFor="kemasan">Kemasan (Opsional)</Label>
                                <MultiSelect
                                    id="kemasan"
                                    options={kemasan.map((k) => ({
                                        value: String(k.id),
                                        label: `${k.qty_kemasan} ml`,
                                    }))}
                                    selected={kemasanIds}
                                    onSelectionChange={setKemasanIds}
                                    placeholder="Semua Kemasan"
                                />
                            </div>

                            <div>
                                <Label htmlFor="start_date">Filter Start Date (Periode)</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="end_date">Filter End Date (Periode)</Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Chart */}
                    <Card className="p-6">
                        <div className="mb-4">
                            <h2 className="text-xl font-semibold">Grafik Penjualan</h2>
                        </div>

                        {loading ? (
                            <div className="flex h-96 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : error ? (
                            <div className="flex h-96 items-center justify-center">
                                <p className="text-destructive">{error}</p>
                            </div>
                        ) : chartData.length === 0 ? (
                            <div className="flex h-96 items-center justify-center">
                                <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={400}>
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        {activeKemasanIds.length > 0 ? (
                                            activeKemasanIds.map((kemasanId, index) => {
                                                const color = colors[index % colors.length];
                                                return (
                                                    <linearGradient key={kemasanId} id={`colorKemasan${kemasanId}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                                    </linearGradient>
                                                );
                                            })
                                        ) : (
                                            <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        )}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                                    <XAxis
                                        dataKey="name"
                                        className="text-xs"
                                        tick={{ fill: 'currentColor' }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis
                                        className="text-xs"
                                        tick={{ fill: 'currentColor' }}
                                        tickFormatter={(value) => formatNumber(value)}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--background)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '6px',
                                        }}
                                        formatter={(value: number, name: string) => {
                                            const formattedValue = formatNumber(value);
                                            // If product filter is active, tooltip already shows product name in legend
                                            // The formatter just formats the number
                                            return formattedValue;
                                        }}
                                        labelFormatter={(label) => {
                                            const productNames = getProductNames();
                                            if (productNames && productIds.length === 1) {
                                                return `${label} - ${productNames}`;
                                            }
                                            return label;
                                        }}
                                    />
                                    <Legend />
                                    {activeKemasanIds.length > 0 ? (
                                        // Render multiple Area for each kemasan
                                        activeKemasanIds.map((kemasanId, index) => {
                                            const kemasanInfo = getKemasanInfo(kemasanId);
                                            const color = colors[index % colors.length];
                                            const productNames = getProductNames();
                                            
                                            // Build label: include product name if available
                                            let label = kemasanInfo 
                                                ? `${kemasanInfo.qty_kemasan} ml` 
                                                : `Kemasan ${kemasanId}`;
                                            
                                            if (productNames) {
                                                if (productIds.length === 1) {
                                                    // Single product: "Produk A - 100 ml"
                                                    label = `${productNames} - ${label}`;
                                                } else {
                                                    // Multiple products: "100 ml (Produk A, Produk B)"
                                                    label = `${label} (${productNames})`;
                                                }
                                            }
                                            
                                            return (
                                                <Area
                                                    key={kemasanId}
                                                    type="monotone"
                                                    dataKey={`kemasan_${kemasanId}`}
                                                    stroke={color}
                                                    fillOpacity={1}
                                                    fill={`url(#colorKemasan${kemasanId})`}
                                                    name={label}
                                                />
                                            );
                                        })
                                    ) : (
                                        // Default single Area if no kemasan filter
                                        <Area
                                            type="monotone"
                                            dataKey="quantity"
                                            stroke="#3b82f6"
                                            fillOpacity={1}
                                            fill="url(#colorQuantity)"
                                            name={getProductNames() || "Quantity"}
                                        />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
