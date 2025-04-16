import React, { useEffect, useState, useCallback } from 'react';
import { Table, Container, Form, Button, Row, Col, Card, Badge, Dropdown, Spinner, Alert } from 'react-bootstrap';
import { 
  BsFilter,
  BsDownload,
  BsEnvelope,
  BsCheckCircleFill,
  BsXCircleFill,
  BsClockHistory
} from 'react-icons/bs';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
} from 'chart.js';
import { API_ENDPOINTS } from '../config';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

interface EmailRecord {
  id: number;
  sent_at: string;
  company_name: string;
  contact_person: string;
  recipient_email: string;
  sector: string;
  state: string;
  success: boolean;
  error_message?: string;
  attachment_name?: string;
}

interface DashboardStats {
  totalEmails: number;
  successRate: number;
  failedEmails: number;
  emailsBySector: Record<string, number>;
  emailsByState: Record<string, number>;
  dailyStats: {
    date: string;
    success: number;
    failed: number;
  }[];
}

interface DateRange {
  start: string;
  end: string;
}

interface EmailRecordFilters {
  start_date: string;
  end_date: string;
  sector: string;
  state: string;
}

const EmailTracking: React.FC = () => {
  const [records, setRecords] = useState<EmailRecord[]>([]);
  const [filters, setFilters] = useState<EmailRecordFilters>({
    start_date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0], // Last 7 days
    end_date: new Date().toISOString().split('T')[0], // Today
    sector: '',
    state: ''
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmails: 0,
    successRate: 0,
    failedEmails: 0,
    emailsBySector: {},
    emailsByState: {},
    dailyStats: [],
  });

  const loadEmailRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `${API_ENDPOINTS.EMAIL_RECORDS}`;
      const params = new URLSearchParams();
      
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.sector) params.append('sector', filters.sector);
      if (filters.state) params.append('state', filters.state);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('Fetching email records from:', url);
      console.log('Request headers:', {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      });
      
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response data:', response.data);
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format: expected an array of records');
      }
      
      setRecords(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Error loading email records:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      setError(error instanceof Error ? error.message : 'An error occurred while loading email records');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const calculateStats = useCallback((records: EmailRecord[]) => {
    try {
      console.log('Calculating stats for records:', records);
      
      const totalEmails = records.length;
      const successfulEmails = records.filter(r => r.success).length;
      const failedEmails = totalEmails - successfulEmails;
      const successRate = totalEmails > 0 ? (successfulEmails / totalEmails) * 100 : 0;

      // Calculate emails by sector
      const emailsBySector = records.reduce((acc, record) => {
        const sector = record.sector || 'Unknown';
        acc[sector] = (acc[sector] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate emails by state
      const emailsByState = records.reduce((acc, record) => {
        const state = record.state || 'Unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate daily statistics
      const dailyStats = records.reduce((acc, record) => {
        const date = new Date(record.sent_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { success: 0, failed: 0 };
        }
        if (record.success) {
          acc[date].success++;
        } else {
          acc[date].failed++;
        }
        return acc;
      }, {} as Record<string, { success: number; failed: number }>);

      const formattedDailyStats = Object.entries(dailyStats)
        .map(([date, stats]) => ({
          date,
          ...stats,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log('Calculated stats:', {
        totalEmails,
        successRate,
        failedEmails,
        emailsBySector,
        emailsByState,
        dailyStats: formattedDailyStats,
      });

      setStats({
        totalEmails,
        successRate,
        failedEmails,
        emailsBySector,
        emailsByState,
        dailyStats: formattedDailyStats,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
      setError('Error calculating statistics from email records');
    }
  }, []);

  useEffect(() => {
    loadEmailRecords();
  }, [loadEmailRecords]);

  const exportToCSV = () => {
    if (records.length === 0) {
      alert('No records to export');
      return;
    }

    const headers = [
      'Date',
      'Company',
      'Contact',
      'Email',
      'Sector',
      'State',
      'Status',
      'Error Message',
      'Attachment',
    ];

    const rows = records.map((record) => {
      const date = new Date(record.sent_at).toLocaleString();
      return [
        date,
        record.company_name,
        record.contact_person,
        record.recipient_email,
        record.sector,
        record.state,
        record.success ? 'Success' : 'Failed',
        record.error_message || '',
        record.attachment_name || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const dateStr = filters.start_date || filters.end_date ? `${filters.start_date} - ${filters.end_date}` : 'all';
    link.href = URL.createObjectURL(blob);
    link.download = `email_records_${dateStr}.csv`;
    link.click();
  };

  const lineChartData = {
    labels: stats.dailyStats.map(stat => stat.date),
    datasets: [
      {
        label: 'Successful Emails',
        data: stats.dailyStats.map(stat => stat.success),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true,
      },
      {
        label: 'Failed Emails',
        data: stats.dailyStats.map(stat => stat.failed),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const sectorChartData = {
    labels: Object.keys(stats.emailsBySector),
    datasets: [
      {
        data: Object.values(stats.emailsBySector),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
      },
    ],
  };

  const stateChartData = {
    labels: Object.keys(stats.emailsByState),
    datasets: [
      {
        label: 'Emails by State',
        data: Object.values(stats.emailsByState),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Email Performance Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Emails by State',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const sectorChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: 'Emails by Sector',
      },
    },
  };

  return (
    <Container className="mt-4">
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Email Tracking Dashboard</h2>
        <div className="d-flex gap-2">
          <div className="d-flex gap-2">
            <Form.Control
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              style={{ width: '150px' }}
            />
            <Form.Control
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              style={{ width: '150px' }}
            />
          </div>
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" id="sector-dropdown">
              <>{BsFilter({ className: 'me-2' })}</> {filters.sector || 'All Sectors'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setFilters({ ...filters, sector: '' })}>All Sectors</Dropdown.Item>
              {Object.keys(stats.emailsBySector).map((sector) => (
                <Dropdown.Item key={sector} onClick={() => setFilters({ ...filters, sector })}>
                  {sector}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" id="state-dropdown">
              <>{BsFilter({ className: 'me-2' })}</> {filters.state || 'All States'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setFilters({ ...filters, state: '' })}>All States</Dropdown.Item>
              {Object.keys(stats.emailsByState).map((state) => (
                <Dropdown.Item key={state} onClick={() => setFilters({ ...filters, state })}>
                  {state}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <Button variant="primary" onClick={exportToCSV} disabled={isLoading}>
            <>{BsDownload({ className: 'me-2' })}</> Export to CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading email records...</p>
        </div>
      ) : (
        <>
          <Row className="mb-4">
            <Col md={3}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <>{BsEnvelope({ size: 40, className: 'text-primary' })}</>
                    </div>
                    <div>
                      <Card.Title className="mb-0">Total Emails</Card.Title>
                      <h2 className="mt-2">{stats.totalEmails}</h2>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <>{BsCheckCircleFill({ size: 40, className: 'text-success' })}</>
                    </div>
                    <div>
                      <Card.Title className="mb-0">Success Rate</Card.Title>
                      <h2 className="mt-2">{stats.successRate.toFixed(1)}%</h2>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <>{BsXCircleFill({ size: 40, className: 'text-danger' })}</>
                    </div>
                    <div>
                      <Card.Title className="mb-0">Failed Emails</Card.Title>
                      <h2 className="mt-2">{stats.failedEmails}</h2>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <>{BsClockHistory({ size: 40, className: 'text-info' })}</>
                    </div>
                    <div>
                      <Card.Title className="mb-0">Avg. Daily</Card.Title>
                      <h2 className="mt-2">
                        {stats.dailyStats.length > 0
                          ? Math.round(stats.totalEmails / stats.dailyStats.length)
                          : 0}
                      </h2>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={8}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Line data={lineChartData} options={chartOptions} />
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Pie data={sectorChartData} options={sectorChartOptions} />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={6}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Card.Title>Top Sectors</Card.Title>
                  <div className="mt-3">
                    {Object.entries(stats.emailsBySector)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([sector, count]) => (
                        <div key={sector} className="d-flex justify-content-between mb-2">
                          <span>{sector}</span>
                          <Badge bg="primary" pill>{count}</Badge>
                        </div>
                      ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Card.Title>Top States</Card.Title>
                  <div className="mt-3">
                    {Object.entries(stats.emailsByState)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([state, count]) => (
                        <div key={state} className="d-flex justify-content-between mb-2">
                          <span>{state}</span>
                          <Badge bg="info" pill>{count}</Badge>
                        </div>
                      ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={12}>
              <Card className="shadow-sm">
                <Card.Body>
                  <Bar data={stateChartData} options={barChartOptions} />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Company</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Sector</th>
                      <th>State</th>
                      <th>Status</th>
                      <th>Attachment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center">
                          No records found for the selected filters
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id}>
                          <td>{new Date(record.sent_at).toLocaleString()}</td>
                          <td>{record.company_name}</td>
                          <td>{record.contact_person}</td>
                          <td>{record.recipient_email}</td>
                          <td>{record.sector}</td>
                          <td>{record.state}</td>
                          <td>
                            {record.success ? (
                              <>{BsCheckCircleFill({ className: 'text-success' })}</>
                            ) : (
                              <>
                                <>{BsXCircleFill({ className: 'text-danger' })}</>
                                {record.error_message && (
                                  <small className="d-block text-danger">
                                    {record.error_message}
                                  </small>
                                )}
                              </>
                            )}
                          </td>
                          <td>{record.attachment_name || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
};

export default EmailTracking; 