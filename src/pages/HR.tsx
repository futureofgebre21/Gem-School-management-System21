import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Users, Calendar, Search } from "lucide-react";

export default function HR() {
  const { schoolId } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (schoolId) {
      loadTeachers();
      loadAttendance();
    }
  }, [schoolId]);

  const loadTeachers = async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*, profiles:user_id(full_name, staff_id)')
      .eq('school_id', schoolId);

    if (error) {
      toast.error('Failed to load teachers');
    } else {
      setTeachers(data || []);
    }
  };

  const loadAttendance = async () => {
    const { data, error } = await (supabase as any)
      .from('attendance')
      .select(`
        *,
        profiles:user_id(full_name, staff_id)
      `)
      .eq('school_id', schoolId)
      .eq('user_type', 'teacher')
      .eq('date', selectedDate)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load attendance');
    } else {
      setAttendance(data || []);
    }
    setLoading(false);
  };

  const markAttendance = async (userId: string, status: string) => {
    const { error } = await (supabase as any)
      .from('attendance')
      .upsert({
        school_id: schoolId,
        user_id: userId,
        user_type: 'teacher',
        date: selectedDate,
        status,
        marked_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) {
      toast.error('Failed to mark attendance');
    } else {
      toast.success('Attendance marked');
      loadAttendance();
    }
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.staff_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HR Management</h1>
          <p className="text-muted-foreground">Manage teachers and their attendance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendance.filter(a => a.status === 'present').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendance.filter(a => a.status === 'absent').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher Attendance - {selectedDate}</CardTitle>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="date">Select Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="search">Search Teachers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Staff ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => {
                const attendanceRecord = attendance.find(a => a.user_id === teacher.user_id);
                return (
                  <TableRow key={teacher.id}>
                    <TableCell>{teacher.profiles?.full_name || 'N/A'}</TableCell>
                    <TableCell>{teacher.staff_id || 'N/A'}</TableCell>
                    <TableCell>{teacher.subject || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        attendanceRecord?.status === 'present' ? 'default' :
                        attendanceRecord?.status === 'absent' ? 'destructive' :
                        attendanceRecord?.status === 'late' ? 'secondary' : 'outline'
                      }>
                        {attendanceRecord?.status || 'Not Marked'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={attendanceRecord?.status === 'present' ? 'default' : 'outline'}
                          onClick={() => markAttendance(teacher.user_id, 'present')}
                        >
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant={attendanceRecord?.status === 'absent' ? 'destructive' : 'outline'}
                          onClick={() => markAttendance(teacher.user_id, 'absent')}
                        >
                          Absent
                        </Button>
                        <Button
                          size="sm"
                          variant={attendanceRecord?.status === 'late' ? 'secondary' : 'outline'}
                          onClick={() => markAttendance(teacher.user_id, 'late')}
                        >
                          Late
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}