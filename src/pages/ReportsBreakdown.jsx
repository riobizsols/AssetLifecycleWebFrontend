import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentBox from '../components/ContentBox';
import CustomTable from '../components/CustomTable';
import API from '../lib/axios';
import { filterData } from '../utils/filterData';

const ReportsBreakdown = () => {
	const navigate = useNavigate();
	const [data, setData] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedRows, setSelectedRows] = useState([]);
	const [sortConfig, setSortConfig] = useState({ sorts: [] });
	const [filterValues, setFilterValues] = useState({ columnFilters: [], fromDate: '', toDate: '' });
	const [columns] = useState([
		{ label: 'Breakdown ID', name: 'breakdown_id', visible: true },
		{ label: 'Asset ID', name: 'asset_id', visible: true },
		{ label: 'Title', name: 'title', visible: true },
		{ label: 'Status', name: 'status', visible: true },
		{ label: 'Severity', name: 'severity', visible: true },
		{ label: 'Created On', name: 'created_on', visible: true },
	]);

	useEffect(() => {
		const fetchBreakdowns = async () => {
			setIsLoading(true);
			try {
				const res = await API.get('/breakdowns');
				const raw = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
				const formatted = raw.map((b) => ({
					...b,
					created_on: b.created_at ? new Date(b.created_at).toLocaleString() : '',
				}));
				setData(formatted);
			} catch (err) {
				console.error('Failed to fetch breakdowns', err);
				setData([]);
			} finally {
				setIsLoading(false);
			}
		};
		fetchBreakdowns();
	}, []);

	const handleSort = (column) => {
		setSortConfig((prevConfig) => {
			const { sorts } = prevConfig;
			const existingSort = sorts.find((s) => s.column === column);
			if (!existingSort) {
				return { sorts: [...sorts, { column, direction: 'asc', order: sorts.length + 1 }] };
			} else if (existingSort.direction === 'asc') {
				return { sorts: sorts.map((s) => (s.column === column ? { ...s, direction: 'desc' } : s)) };
			} else {
				return { sorts: sorts.filter((s) => s.column !== column).map((s, idx) => ({ ...s, order: idx + 1 })) };
			}
		});
	};

	const sortData = (rows) => {
		if (!sortConfig.sorts.length) return rows;
		return [...rows].sort((a, b) => {
			for (const { column, direction } of sortConfig.sorts) {
				const aValue = a[column];
				const bValue = b[column];
				if (aValue == null) return 1;
				if (bValue == null) return -1;
				if (!isNaN(aValue) && !isNaN(bValue)) {
					const diff = direction === 'asc' ? aValue - bValue : bValue - aValue;
					if (diff !== 0) return diff;
				} else {
					const diff = direction === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
					if (diff !== 0) return diff;
				}
			}
			return 0;
		});
	};

	const handleFilterChange = (filterType, value) => {
		setFilterValues((prev) => {
			if (filterType === 'columnFilters') {
				return { ...prev, columnFilters: value };
			} else if (filterType === 'fromDate' || filterType === 'toDate') {
				return { ...prev, [filterType]: value };
			} else {
				return { ...prev, [filterType]: value };
			}
		});
	};

	const filters = columns.map((col) => ({
		label: col.label,
		name: col.name,
		options: [],
		onChange: (value) => handleFilterChange(col.name, value),
	}));

	return (
		<div className="p-4">
			<ContentBox
				filters={filters}
				onFilterChange={handleFilterChange}
				onSort={handleSort}
				sortConfig={sortConfig}
				data={data}
				selectedRows={selectedRows}
				setSelectedRows={setSelectedRows}
				showActions={false}
				onAdd={() => navigate('/breakdown-selection')}
			>
				{({ visibleColumns }) => {
					const filtered = filterData(data, filterValues, visibleColumns);
					const sorted = sortData(filtered);
					return (
						<CustomTable
							visibleColumns={visibleColumns}
							data={isLoading ? [] : sorted}
							selectedRows={selectedRows}
							setSelectedRows={setSelectedRows}
							rowKey="breakdown_id"
							showActions={false}
							onRowClick={(row) => navigate('/breakdown-details', { state: { breakdown: row } })}
						/>
					);
				}}
			</ContentBox>
		</div>
	);
};

export default ReportsBreakdown;


