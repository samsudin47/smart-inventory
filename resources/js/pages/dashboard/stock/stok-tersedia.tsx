import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type User } from '@/types';
import { Head } from '@inertiajs/react';
import { Download, Loader2, Package, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import AuthenticatedLayout from '../../../layouts/authenticated-layout';

type Props = {
    user: User;
};

type Kios = {
    id: number;
    nama: string;
};

type FA = {
    id: number;
    name: string;
    email: string;
    role: string;
};

type Product = {
    id: number;
    nama: string;
    kemasan: string;
    satuan: string | null;
};

type StockTersedia = {
    product_id: number;
    kios_id: number;
    total_masuk: number;
    total_keluar: number;
    quantity_tersedia: number;
    bulan: string | null;
    latest_date: string | null;
    product: Product;
    kios: Kios;
};

type ApiResponse<T> = {
    success: boolean;
    data: T;
    summary?: {
        total_products: number;
        total_masuk: number;
        total_keluar: number;
        total_stock_tersedia: number;
    };
    message: string;
};

export default function StokTersediaDashboard({ user }: Props) {
    const [stockTersedia, setStockTersedia] = useState<StockTersedia[]>([]);
    const [filteredStock, setFilteredStock] = useState<StockTersedia[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedKios, setSelectedKios] = useState<string>('all');
    const [selectedFA, setSelectedFA] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [kios, setKios] = useState<Kios[]>([]);
    const [users, setUsers] = useState<FA[]>([]);
    const [summary, setSummary] = useState({
        total_products: 0,
        total_masuk: 0,
        total_keluar: 0,
        total_stock_tersedia: 0,
    });

    // Helper untuk mendapatkan CSRF token
    const getCsrfToken = () => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        return token || '';
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

    // Fetch users (FA) - hanya untuk Assistant Area Manager
    const fetchUsers = async () => {
        if (user.role !== 'Assistant Area Manager') {
            return; // Field Assistant tidak perlu fetch users
        }

        try {
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                console.error('CSRF token tidak ditemukan');
                return;
            }

            const response = await fetch('/api/petugas/dropdown', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                credentials: 'include',
            });

            if (response.status === 419) {
                console.error('CSRF token mismatch saat mengambil data users');
                return;
            }

            if (!response.ok) {
                // Jangan log error untuk 404 - route mungkin belum terdaftar atau ada masalah dengan middleware
                if (response.status !== 404) {
                    console.error('Error fetching users:', response.status, response.statusText);
                }
                return;
            }

            try {
                const result: ApiResponse<FA[]> = await response.json();
                if (result.success) {
                    setUsers(result.data);
                } else {
                    console.warn('Failed to fetch users:', result.message);
                }
            } catch (parseError) {
                console.error('Error parsing users response:', parseError);
            }
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('fetch')) {
                console.warn('Network error saat mengambil data users');
            } else {
                console.error('Error fetching users:', err);
            }
        }
    };

    // Fetch data dari API
    const fetchStockTersedia = async (kiosId?: string, userId?: string, startDate?: string, endDate?: string) => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            if (kiosId && kiosId !== 'all') {
                params.append('kios_id', kiosId);
            }
            if (userId && userId !== 'all') {
                params.append('user_id', userId);
            }
            if (startDate) {
                params.append('start_date', startDate);
            }
            if (endDate) {
                params.append('end_date', endDate);
            }
            const response = await fetch(`/api/stock-tersedia?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil data stock tersedia');
            }

            const result: ApiResponse<StockTersedia[]> = await response.json();
            if (result.success) {
                setStockTersedia(result.data);
                setFilteredStock(result.data);
                if (result.summary) {
                    setSummary(result.summary);
                }
            } else {
                throw new Error(result.message || 'Gagal mengambil data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            console.error('Error fetching stock tersedia:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle download
    const handleDownload = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedKios && selectedKios !== 'all') {
                params.append('kios_id', selectedKios);
            }
            if (user.role === 'Assistant Area Manager' && selectedFA && selectedFA !== 'all') {
                params.append('user_id', selectedFA);
            }
            if (startDate) {
                params.append('start_date', startDate);
            }
            if (endDate) {
                params.append('end_date', endDate);
            }

            const response = await fetch(`/api/stock-tersedia/download?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Gagal mengunduh data');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'stock-tersedia.xlsx'
                : 'stock-tersedia.xlsx';
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunduh');
            console.error('Error downloading stock tersedia:', err);
        }
    };

    // Filter data berdasarkan search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredStock(stockTersedia);
            return;
        }

        const filtered = stockTersedia.filter((item) => {
            const productName = item.product?.nama?.toLowerCase() || '';
            const kiosName = item.kios?.nama?.toLowerCase() || '';
            const search = searchTerm.toLowerCase();
            return productName.includes(search) || kiosName.includes(search);
        });

        setFilteredStock(filtered);
    }, [searchTerm, stockTersedia]);

    // Fetch data on component mount and when filters change
    useEffect(() => {
        fetchStockTersedia(
            selectedKios === 'all' ? undefined : selectedKios,
            user.role === 'Assistant Area Manager' && selectedFA !== 'all' ? selectedFA : undefined,
            startDate || undefined,
            endDate || undefined,
        );
    }, [selectedKios, selectedFA, startDate, endDate, user.role]);

    // Fetch kios and users on component mount - hanya sekali
    useEffect(() => {
        fetchKios();
        if (user.role === 'Assistant Area Manager') {
            fetchUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Use summary statistics from API (calculated from all data, not filtered)
    const totalProducts = summary.total_products;
    const totalMasuk = summary.total_masuk;
    const totalKeluar = summary.total_keluar;
    const totalStockTersedia = summary.total_stock_tersedia;

    return (
        <>
            <Head title="Stock Tersedia" />

            <AuthenticatedLayout>
                <div className="rounded-md bg-white p-4 shadow-md md:p-6 dark:bg-gray-800">
                    <div className="mb-4 md:mb-6">
                        <h1 className="text-xl font-semibold md:text-2xl">Stock Tersedia</h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            Lihat sisa stock yang tersedia berdasarkan perhitungan stock masuk dan stock keluar.
                        </p>
                    </div>

                    {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

                    {/* Summary Cards */}
                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mb-6 lg:grid-cols-4">
                        <div className="rounded-md border bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Produk</p>
                                    <p className="mt-1 text-2xl font-semibold">{totalProducts}</p>
                                </div>
                                <Package className="h-8 w-8 text-blue-500" />
                            </div>
                        </div>

                        <div className="rounded-md border bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Stock Masuk</p>
                                    <p className="mt-1 text-2xl font-semibold">{totalMasuk.toLocaleString('id-ID')}</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-green-500" />
                            </div>
                        </div>

                        <div className="rounded-md border bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Stock Keluar</p>
                                    <p className="mt-1 text-2xl font-semibold">{totalKeluar.toLocaleString('id-ID')}</p>
                                </div>
                                <TrendingDown className="h-8 w-8 text-red-500" />
                            </div>
                        </div>

                        <div className="rounded-md border bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Stock Tersedia</p>
                                    <p className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
                                        {totalStockTersedia.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <Package className="h-8 w-8 text-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Filter */}
                    <Card className="mb-4 p-3 sm:p-4">
                        <div
                            className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${user.role === 'Assistant Area Manager' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} sm:gap-4`}
                        >
                            {user.role === 'Assistant Area Manager' && (
                                <div className="w-full">
                                    <Label htmlFor="fa" className="text-xs sm:text-sm">
                                        Filter Nama FA
                                    </Label>
                                    <Select value={selectedFA} onValueChange={(value) => setSelectedFA(value)}>
                                        <SelectTrigger id="fa" className="h-9 text-xs sm:text-sm">
                                            <SelectValue placeholder="Pilih FA" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua FA</SelectItem>
                                            {users.map((u) => (
                                                <SelectItem key={u.id} value={u.id.toString()}>
                                                    {u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="w-full">
                                <Label htmlFor="kios" className="text-xs sm:text-sm">
                                    Filter Kios
                                </Label>
                                <Select value={selectedKios} onValueChange={(value) => setSelectedKios(value)}>
                                    <SelectTrigger id="kios" className="h-9 text-xs sm:text-sm">
                                        <SelectValue placeholder="Pilih Kios" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Kios</SelectItem>
                                        {kios.map((k) => (
                                            <SelectItem key={k.id} value={k.id.toString()}>
                                                {k.nama}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-full">
                                <Label htmlFor="start_date" className="text-xs sm:text-sm">
                                    Filter Start Date (Periode)
                                </Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-9 text-xs sm:text-sm"
                                />
                            </div>
                            <div className="w-full">
                                <Label htmlFor="end_date" className="text-xs sm:text-sm">
                                    Filter End Date (Periode)
                                </Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-9 text-xs sm:text-sm"
                                />
                            </div>
                            <div className="flex w-full items-end">
                                <Button
                                    variant="outline"
                                    onClick={handleDownload}
                                    className="flex h-9 w-full cursor-pointer items-center gap-2 text-xs sm:text-sm"
                                >
                                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Download Excel</span>
                                    <span className="sm:hidden">Download</span>
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Search Bar */}
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Cari berdasarkan nama produk atau kios..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <span className="ml-2 text-gray-600 dark:text-gray-400">Memuat data...</span>
                        </div>
                    ) : filteredStock.length === 0 ? (
                        <div className="rounded-md border bg-gray-50 p-8 text-center dark:bg-gray-700">
                            <p className="text-gray-600 dark:text-gray-400">
                                {searchTerm ? 'Tidak ada data yang sesuai dengan pencarian.' : 'Tidak ada data stock tersedia.'}
                            </p>
                        </div>
                    ) : (
                        <div className="-mx-2 w-full overflow-x-auto rounded-md border sm:-mx-4 md:mx-0 dark:border-gray-600">
                            <div className="inline-block min-w-full align-middle">
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[50px] text-xs sm:text-sm">No</TableHead>
                                            <TableHead className="min-w-[120px] text-xs sm:min-w-[150px] sm:text-sm">Produk</TableHead>
                                            <TableHead className="min-w-[100px] text-xs sm:min-w-[120px] sm:text-sm">Kemasan</TableHead>
                                            <TableHead className="min-w-[120px] text-xs sm:min-w-[150px] sm:text-sm">Kios</TableHead>
                                            <TableHead className="min-w-[100px] text-center text-xs sm:min-w-[120px] sm:text-sm">
                                                Stock Masuk
                                            </TableHead>
                                            <TableHead className="min-w-[100px] text-center text-xs sm:min-w-[120px] sm:text-sm">
                                                Stock Keluar
                                            </TableHead>
                                            <TableHead className="min-w-[100px] text-center text-xs sm:min-w-[120px] sm:text-sm">
                                                Stock Tersedia
                                            </TableHead>
                                            <TableHead className="min-w-[100px] text-center text-xs sm:min-w-[120px] sm:text-sm">Bulan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStock.map((item, index) => (
                                            <TableRow key={`${item.product_id}-${item.kios_id}`}>
                                                <TableCell className="text-xs sm:text-sm">{index + 1}</TableCell>
                                                <TableCell className="text-xs font-medium sm:text-sm">{item.product?.nama || '-'}</TableCell>
                                                <TableCell className="text-xs sm:text-sm">{item.product?.kemasan || '-'}</TableCell>
                                                <TableCell className="text-xs sm:text-sm">{item.kios?.nama || '-'}</TableCell>
                                                <TableCell className="text-center text-xs text-green-600 sm:text-sm dark:text-green-400">
                                                    {item.total_masuk.toLocaleString('id-ID')}
                                                </TableCell>
                                                <TableCell className="text-center text-xs text-red-600 sm:text-sm dark:text-red-400">
                                                    {item.total_keluar.toLocaleString('id-ID')}
                                                </TableCell>
                                                <TableCell className="text-center text-xs font-semibold text-blue-600 sm:text-sm dark:text-blue-400">
                                                    {item.quantity_tersedia.toLocaleString('id-ID')}
                                                </TableCell>
                                                <TableCell className="text-center text-xs sm:text-sm">
                                                    {item.bulan
                                                        ? new Date(item.bulan + '-01').toLocaleDateString('id-ID', {
                                                              month: 'long',
                                                              year: 'numeric',
                                                          })
                                                        : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="mt-4 rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        <p className="font-medium">Catatan:</p>
                        <p className="mt-1">
                            Stock Tersedia dihitung secara otomatis dari selisih antara total Stock Masuk dan total Stock Keluar. Data ini bersifat
                            read-only dan tidak dapat diedit atau dihapus.
                        </p>
                    </div>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
