import ApprovalRequestsManager from '../components/ApprovalRequestsManager';

export default function ApprovalRequests() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">طلبات الموافقة</h2>
        <p className="section-subtitle">مراجعة العمليات الحساسة واعتمادها أو رفضها قبل تنفيذها.</p>
      </div>
      <ApprovalRequestsManager showEmptyState />
    </div>
  );
}
