import { type User } from '@/types';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../../layouts/authenticated-layout';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

type Props = {
    user: User;
};

type Petugas = {
    id: number;
    name: string;
    email: string;
    role: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
};

type ApiResponse<T> = {
    success: boolean;
    data: T;
    message: string;
};

export default function DataPetugasDashboard({ user }: Props) {
    const [petugas, setPetugas] = useState<Petugas[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper untuk mendapatkan CSRF token
    const getCsrfToken = () => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        return token || '';
    };

    // Fetch data dari API
    const fetchPetugas = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/petugas', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil data petugas');
            }

            const result: ApiResponse<Petugas[]> = await response.json();
            if (result.success) {
                setPetugas(result.data);
            } else {
                throw new Error(result.message || 'Gagal mengambil data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            console.error('Error fetching petugas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPetugas();
    }, []);

    return (
        <>
            <Head title="Data Petugas" />

            <AuthenticatedLayout>
                <div className="rounded-md bg-white p-6 shadow-md dark:bg-gray-800">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold">Data Petugas</h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            Daftar petugas yang terdaftar dalam sistem.
                        </p>
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
                        <div className="overflow-x-auto rounded-md border dark:border-gray-700">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            No
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            Nama
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            Role
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            Dibuat
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                    {petugas.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                Tidak ada data petugas
                                            </td>
                                        </tr>
                                    ) : (
                                        petugas.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                                    {index + 1}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {item.name}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {item.email}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {item.role}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(item.created_at).toLocaleDateString('id-ID')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </AuthenticatedLayout>
        </>
    );
}
