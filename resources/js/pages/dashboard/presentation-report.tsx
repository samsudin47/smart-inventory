import { type User } from '@/types';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/authenticated-layout';
import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    const [period, setPeriod] = useState<'30_hari_sebelumnya' | 'per_hari' | 'per_minggu' | 'per_bulan'>('30_hari_sebelumnya');
    const [productId, setProductId] = useState<string>('');
    const [kiosId, setKiosId] = useState<string>('');
    
    // Options for filters
    const [products, setProducts] = useState<Product[]>([]);
    const [kios, setKios] = useState<Kios[]>([]);

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

    // Fetch report data
    const fetchReportData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            params.append('type', 'penjualan'); // Default to penjualan
            params.append('period', period);
            if (productId) {
                params.append('product_id', productId);
            }
            if (kiosId) {
                params.append('kios_id', kiosId);
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
    }, [period, productId, kiosId]);

    // Fetch data when filters change
    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    // Fetch products and kios on mount
    useEffect(() => {
        fetchProducts();
        fetchKios();
    }, []);

    // Format number with thousand separator
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    };

    // Prepare chart data
    const chartData = reportData.map((item) => ({
        name: item.label,
        quantity: item.total_quantity,
        transactions: item.total_transactions,
    }));

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
                    <Card className="p-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <Label htmlFor="period">Periode</Label>
                                <Select
                                    value={period}
                                    onValueChange={(value: '30_hari_sebelumnya' | 'per_hari' | 'per_minggu' | 'per_bulan') =>
                                        setPeriod(value)
                                    }
                                >
                                    <SelectTrigger id="period">
                                        <SelectValue placeholder="Pilih Periode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="30_hari_sebelumnya">30 Hari Sebelumnya</SelectItem>
                                        <SelectItem value="per_hari">Per Hari</SelectItem>
                                        <SelectItem value="per_minggu">Per Minggu</SelectItem>
                                        <SelectItem value="per_bulan">Per Bulan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="product">Produk (Opsional)</Label>
                                <Select value={productId || 'all'} onValueChange={(value) => setProductId(value === 'all' ? '' : value)}>
                                    <SelectTrigger id="product">
                                        <SelectValue placeholder="Semua Produk" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Produk</SelectItem>
                                        {products.map((product) => (
                                            <SelectItem key={product.id} value={String(product.id)}>
                                                {product.nama}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="kios">Kios (Opsional)</Label>
                                <Select value={kiosId || 'all'} onValueChange={(value) => setKiosId(value === 'all' ? '' : value)}>
                                    <SelectTrigger id="kios">
                                        <SelectValue placeholder="Semua Kios" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Kios</SelectItem>
                                        {kios.map((k) => (
                                            <SelectItem key={k.id} value={String(k.id)}>
                                                {k.nama}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                        <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
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
                                        formatter={(value: number) => formatNumber(value)}
                                    />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey="quantity"
                                        stroke="#3b82f6"
                                        fillOpacity={1}
                                        fill="url(#colorQuantity)"
                                        name="Quantity"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
