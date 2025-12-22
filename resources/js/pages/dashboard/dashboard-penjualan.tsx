import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Head } from '@inertiajs/react';
import { Loader2, Package, ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AuthenticatedLayout from '../../layouts/authenticated-layout';

type Product = {
    id: number;
    nama: string;
    kemasan: string;
    satuan: string | null;
};

type ProductRanking = {
    product_id: number;
    product: Product;
    qty_terjual: number;
    total_transaksi: number;
    stock_masuk_periode: number;
    stock_tersedia_sekarang: number;
    persentase: number;
    persentase_perubahan: number;
    periode: {
        start: string;
        end: string;
        month: string;
        year: string;
    };
};

type Summary = {
    total_products_sold: number;
    total_qty_terjual: number;
    total_transaksi: number;
    total_stock_masuk: number;
    overall_persentase: number;
    persentase_perubahan: number;
    periode: {
        start: string;
        end: string;
        month: string;
        year: string;
        month_name: string;
    };
};

type ApiResponse<T> = {
    success: boolean;
    data: T;
    meta?: unknown;
    message: string;
};

export default function DashboardPenjualan() {
    const [productRanking, setProductRanking] = useState<ProductRanking[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>('');

    // Helper untuk mendapatkan CSRF token
    const getCsrfToken = () => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        return token || '';
    };

    // Generate months for select
    const generateMonths = () => {
        const months = [];
        const currentDate = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            months.push({ value: monthKey, label: monthName });
        }
        return months;
    };

    // Generate years for select
    const generateYears = () => {
        const years = [];
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            years.push({ value: String(year), label: String(year) });
        }
        return years;
    };

    // Fetch product ranking data
    const fetchProductRanking = useCallback(async (month?: string, year?: string) => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (month) {
                params.append('month', month);
            } else if (year) {
                params.append('year', year);
            }

            const response = await fetch(`/api/dashboard-penjualan/product-ranking?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil data ranking produk');
            }

            const result: ApiResponse<ProductRanking[]> = await response.json();
            if (result.success) {
                setProductRanking(result.data);
            } else {
                throw new Error(result.message || 'Gagal mengambil data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            console.error('Error fetching product ranking:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch summary data
    const fetchSummary = useCallback(async (month?: string, year?: string) => {
        try {
            const params = new URLSearchParams();
            if (month) {
                params.append('month', month);
            } else if (year) {
                params.append('year', year);
            }

            const response = await fetch(`/api/dashboard-penjualan/summary?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil data summary');
            }

            const result: ApiResponse<Summary> = await response.json();
            if (result.success) {
                setSummary(result.data);
            }
        } catch (err) {
            console.error('Error fetching summary:', err);
        }
    }, []);

    // Fetch data when month/year changes
    useEffect(() => {
        fetchProductRanking(selectedMonth || undefined, selectedYear || undefined);
        fetchSummary(selectedMonth || undefined, selectedYear || undefined);
    }, [selectedMonth, selectedYear, fetchProductRanking, fetchSummary]);

    // Format number with thousand separator (Indonesia format: 1.000.000)
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    };

    // Format percentage with comma as decimal separator (Indonesia format: 60,00%)
    const formatPercentage = (num: number, decimals: number = 2) => {
        return num.toFixed(decimals).replace('.', ',');
    };

    return (
        <>
            <Head title="Dashboard Inventory" />

            <AuthenticatedLayout>
                <div className="space-y-4 p-4 md:space-y-6 md:p-6">
                    {/* Header */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard Inventory</h1>
                            <p className="mt-1 text-sm text-muted-foreground md:text-base">Analisis data stock dan ranking produk</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <Card className="p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <Label htmlFor="month">Filter Bulan</Label>
                                <Select
                                    value={selectedMonth}
                                    onValueChange={(value) => {
                                        setSelectedMonth(value);
                                        setSelectedYear('');
                                    }}
                                >
                                    <SelectTrigger id="month">
                                        <SelectValue placeholder="Pilih Bulan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {generateMonths().map((month) => (
                                            <SelectItem key={month.value} value={month.value}>
                                                {month.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="year">Filter Tahun</Label>
                                <Select
                                    value={selectedYear}
                                    onValueChange={(value) => {
                                        setSelectedYear(value);
                                        setSelectedMonth('');
                                    }}
                                >
                                    <SelectTrigger id="year">
                                        <SelectValue placeholder="Pilih Tahun" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {generateYears().map((year) => (
                                            <SelectItem key={year.value} value={year.value}>
                                                {year.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedMonth('');
                                    setSelectedYear('');
                                }}
                                className="w-full sm:w-auto"
                            >
                                Reset
                            </Button>
                        </div>
                    </Card>

                    {/* Summary Cards */}
                    {summary && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <Card className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Produk Keluar</p>
                                        <p className="mt-1 text-2xl font-bold">{formatNumber(summary.total_products_sold)}</p>
                                    </div>
                                    <Package className="h-8 w-8 text-muted-foreground" />
                                </div>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Qty Keluar</p>
                                        <p className="mt-1 text-2xl font-bold">{formatNumber(summary.total_qty_terjual)}</p>
                                    </div>
                                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                                </div>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Persentase Stock Keluar</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <p className="text-2xl font-bold">{formatPercentage(summary.overall_persentase)}%</p>
                                            {summary.persentase_perubahan !== 0 && (
                                                <div
                                                    className={`flex items-center gap-1 text-sm ${
                                                        summary.persentase_perubahan > 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}
                                                >
                                                    {summary.persentase_perubahan > 0 ? (
                                                        <TrendingUp className="h-4 w-4" />
                                                    ) : (
                                                        <TrendingDown className="h-4 w-4" />
                                                    )}
                                                    <span>{formatPercentage(Math.abs(summary.persentase_perubahan), 1)}%</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Product Ranking Table */}
                    <Card className="p-6">
                        <div className="mb-4">
                            <h2 className="text-xl font-semibold">Peringkat Produk</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{summary?.periode.month_name || 'Bulan ini'}</p>
                        </div>

                        {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : productRanking.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">Tidak ada data stock keluar untuk periode yang dipilih.</div>
                        ) : (
                            <div className="-mx-4 overflow-x-auto md:mx-0">
                                <div className="inline-block min-w-full align-middle">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12 min-w-[60px]">Rank</TableHead>
                                                <TableHead className="min-w-[200px]">Produk</TableHead>
                                                <TableHead className="min-w-[120px] text-right">Qty Stock Keluar</TableHead>
                                                <TableHead className="min-w-[100px] text-right">Persentase</TableHead>
                                                <TableHead className="min-w-[120px] text-right">Perubahan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productRanking.map((item, index) => (
                                                <TableRow key={item.product_id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg font-bold">#{index + 1}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{item.product.nama}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {item.product.kemasan}
                                                                {item.product.satuan && ` - ${item.product.satuan}`}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatNumber(item.qty_terjual)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-medium">{formatPercentage(item.persentase)}%</span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.persentase_perubahan !== 0 && (
                                                            <div
                                                                className={`flex items-center justify-end gap-1 ${
                                                                    item.persentase_perubahan > 0 ? 'text-green-600' : 'text-red-600'
                                                                }`}
                                                            >
                                                                {item.persentase_perubahan > 0 ? (
                                                                    <TrendingUp className="h-4 w-4" />
                                                                ) : (
                                                                    <TrendingDown className="h-4 w-4" />
                                                                )}
                                                                <span className="font-medium">
                                                                    {formatPercentage(Math.abs(item.persentase_perubahan), 1)}%
                                                                </span>
                                                            </div>
                                                        )}
                                                        {item.persentase_perubahan === 0 && <span className="text-muted-foreground">-</span>}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
