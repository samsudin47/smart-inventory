import { type User } from '@/types';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../../layouts/authenticated-layout';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

type Props = {
    user: User;
};

type Kios = {
    id: number;
    nama: string;
    created_at: string;
    updated_at: string;
};

type ApiResponse<T> = {
    success: boolean;
    data: T;
    message: string;
};

export default function DataKiosDashboard({ user }: Props) {
    const [kios, setKios] = useState<Kios[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedKios, setSelectedKios] = useState<Kios | null>(null);
    const [formData, setFormData] = useState({ nama: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Helper untuk mendapatkan CSRF token
    const getCsrfToken = () => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        return token || '';
    };

    // Fetch data dari API
    const fetchKios = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/kios', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil data kios');
            }

            const result: ApiResponse<Kios[]> = await response.json();
            if (result.success) {
                setKios(result.data);
            } else {
                throw new Error(result.message || 'Gagal mengambil data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            console.error('Error fetching kios:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKios();
    }, []);

    // Handle create/edit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const url = selectedKios ? `/api/kios/${selectedKios.id}` : '/api/kios';
            const method = selectedKios ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menyimpan data');
            }

            const result: ApiResponse<Kios> = await response.json();
            if (result.success) {
                setIsDialogOpen(false);
                setFormData({ nama: '' });
                setSelectedKios(null);
                await fetchKios();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan');
            console.error('Error saving kios:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deleteId) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/kios/${deleteId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menghapus data');
            }

            const result: ApiResponse<null> = await response.json();
            if (result.success) {
                setIsDeleteDialogOpen(false);
                setDeleteId(null);
                await fetchKios();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus');
            console.error('Error deleting kios:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open create dialog
    const openCreateDialog = () => {
        setSelectedKios(null);
        setFormData({ nama: '' });
        setIsDialogOpen(true);
    };

    // Open edit dialog
    const openEditDialog = (kiosItem: Kios) => {
        setSelectedKios(kiosItem);
        setFormData({ nama: kiosItem.nama });
        setIsDialogOpen(true);
    };

    // Open delete dialog
    const openDeleteDialog = (id: number) => {
        setDeleteId(id);
        setIsDeleteDialogOpen(true);
    };

    return (
        <>
            <Head title="Data Kios" />

            <AuthenticatedLayout>
                <div className="rounded-md bg-white p-4 shadow-md dark:bg-gray-800 md:p-6">
                    <div className="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold md:text-2xl">Data Kios</h1>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                Kelola data kios yang terdaftar dalam sistem.
                            </p>
                        </div>
                        {(user.role === 'Field Assistant' || user.role === 'Assistant Area Manager') && (
                            <Button onClick={openCreateDialog} className="cursor-pointer gap-2 w-full sm:w-auto">
                                <Plus className="size-4" />
                                Tambah Kios
                            </Button>
                        )}
                    </div>

                    {error && (
                        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="size-8 animate-spin text-gray-400" />
                            <span className="ml-2 text-gray-600 dark:text-gray-300">Memuat data...</span>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto rounded-md border dark:border-gray-700 -mx-2 sm:-mx-4 md:mx-0">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 min-w-[50px]">
                                            No
                                        </th>
                                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 min-w-[150px]">
                                            Nama Kios
                                        </th>
                                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 min-w-[120px]">
                                            Dibuat
                                        </th>
                                        <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 min-w-[100px]">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                    {kios.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-3 sm:px-6 py-8 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                                Tidak ada data kios
                                            </td>
                                        </tr>
                                    ) : (
                                        kios.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="whitespace-nowrap px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                                                    {index + 1}
                                                </td>
                                                <td className="whitespace-nowrap px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {item.nama}
                                                </td>
                                                <td className="whitespace-nowrap px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(item.created_at).toLocaleDateString('id-ID')}
                                                </td>
                                                <td className="whitespace-nowrap px-3 sm:px-6 py-4 text-center text-xs sm:text-sm font-medium">
                                                    {(user.role === 'Field Assistant' || user.role === 'Assistant Area Manager') && (
                                                        <div className="flex justify-center gap-1 sm:gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEditDialog(item)}
                                                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 cursor-pointer"
                                                            >
                                                                <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openDeleteDialog(item.id)}
                                                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700 cursor-pointer"
                                                            >
                                                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Create/Edit Dialog */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[95vh] overflow-y-auto p-4 sm:p-6">
                            <DialogHeader>
                                <DialogTitle>{selectedKios ? 'Edit Kios' : 'Tambah Kios Baru'}</DialogTitle>
                                <DialogDescription>
                                    {selectedKios
                                        ? 'Ubah informasi kios di bawah ini.'
                                        : 'Masukkan informasi kios baru di bawah ini.'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="nama" className="text-xs sm:text-sm">Nama Kios</Label>
                                        <Input
                                            id="nama"
                                            value={formData.nama}
                                            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                            placeholder="Masukkan nama kios"
                                            required
                                            className="text-xs sm:text-sm"
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsDialogOpen(false);
                                            setFormData({ nama: '' });
                                            setSelectedKios(null);
                                        }}
                                        disabled={isSubmitting}
                                        className="cursor-pointer w-full sm:w-auto text-xs sm:text-sm"
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} className="cursor-pointer w-full sm:w-auto text-xs sm:text-sm">
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            'Simpan'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Hapus Kios</DialogTitle>
                                <DialogDescription>
                                    Apakah Anda yakin ingin menghapus kios ini? Tindakan ini tidak dapat dibatalkan.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsDeleteDialogOpen(false);
                                        setDeleteId(null);
                                    }}
                                    disabled={isSubmitting}
                                    className="cursor-pointer"
                                >
                                    Batal
                                </Button>
                                <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="cursor-pointer">
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                            Menghapus...
                                        </>
                                    ) : (
                                        'Hapus'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
