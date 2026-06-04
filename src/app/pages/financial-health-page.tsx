import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  PiggyBank,
  CreditCard,
  Calendar,
  Target,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface FinancialData {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  totalDebts: number;
  monthlyDebtPayment: number;
  emergencyFund: number;
  investments: number;
  age: number;
  retirementAge: number;
  retirementGoal: number;
}

interface HealthMetrics {
  overallScore: number;
  debtRisk: "Low" | "Moderate" | "High" | "Critical";
  emergencyFundStatus: "Excellent" | "Good" | "Needs Improvement" | "Critical";
  retirementReadiness: "On Track" | "Slightly Behind" | "Behind" | "Critical";
  savingsRate: "Excellent" | "Good" | "Fair" | "Poor";
  debtToIncomeRatio: number;
  savingsRatePercent: number;
  monthsOfEmergencyFund: number;
  yearsToRetirement: number;
  retirementProgress: number;
}

export function FinancialHealthPage() {
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState<FinancialData>({
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlySavings: 0,
    totalDebts: 0,
    monthlyDebtPayment: 0,
    emergencyFund: 0,
    investments: 0,
    age: 30,
    retirementAge: 65,
    retirementGoal: 500000,
  });
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);

  const calculateMetrics = (data: FinancialData): HealthMetrics => {
    // Debt to Income Ratio
    const debtToIncomeRatio = data.monthlyIncome > 0 
      ? (data.monthlyDebtPayment / data.monthlyIncome) * 100 
      : 0;

    // Savings Rate
    const savingsRatePercent = data.monthlyIncome > 0 
      ? (data.monthlySavings / data.monthlyIncome) * 100 
      : 0;

    // Emergency Fund in Months
    const monthsOfEmergencyFund = data.monthlyExpenses > 0 
      ? data.emergencyFund / data.monthlyExpenses 
      : 0;

    // Years to Retirement
    const yearsToRetirement = data.retirementAge - data.age;

    // Retirement Progress
    const currentRetirementSavings = data.investments;
    const retirementProgress = data.retirementGoal > 0 
      ? (currentRetirementSavings / data.retirementGoal) * 100 
      : 0;

    // Determine Debt Risk
    let debtRisk: HealthMetrics["debtRisk"];
    if (debtToIncomeRatio < 15) debtRisk = "Low";
    else if (debtToIncomeRatio < 30) debtRisk = "Moderate";
    else if (debtToIncomeRatio < 50) debtRisk = "High";
    else debtRisk = "Critical";

    // Determine Emergency Fund Status
    let emergencyFundStatus: HealthMetrics["emergencyFundStatus"];
    if (monthsOfEmergencyFund >= 6) emergencyFundStatus = "Excellent";
    else if (monthsOfEmergencyFund >= 3) emergencyFundStatus = "Good";
    else if (monthsOfEmergencyFund >= 1) emergencyFundStatus = "Needs Improvement";
    else emergencyFundStatus = "Critical";

    // Determine Retirement Readiness
    const expectedProgressPercent = ((data.age - 25) / (data.retirementAge - 25)) * 100;
    let retirementReadiness: HealthMetrics["retirementReadiness"];
    if (retirementProgress >= expectedProgressPercent) retirementReadiness = "On Track";
    else if (retirementProgress >= expectedProgressPercent * 0.8) retirementReadiness = "Slightly Behind";
    else if (retirementProgress >= expectedProgressPercent * 0.5) retirementReadiness = "Behind";
    else retirementReadiness = "Critical";

    // Determine Savings Rate Quality
    let savingsRate: HealthMetrics["savingsRate"];
    if (savingsRatePercent >= 20) savingsRate = "Excellent";
    else if (savingsRatePercent >= 10) savingsRate = "Good";
    else if (savingsRatePercent >= 5) savingsRate = "Fair";
    else savingsRate = "Poor";

    // Calculate Overall Score (0-100)
    let overallScore = 0;
    
    // Debt Score (30 points max)
    if (debtRisk === "Low") overallScore += 30;
    else if (debtRisk === "Moderate") overallScore += 20;
    else if (debtRisk === "High") overallScore += 10;
    
    // Emergency Fund Score (25 points max)
    if (emergencyFundStatus === "Excellent") overallScore += 25;
    else if (emergencyFundStatus === "Good") overallScore += 18;
    else if (emergencyFundStatus === "Needs Improvement") overallScore += 10;
    else overallScore += 5;
    
    // Savings Rate Score (25 points max)
    if (savingsRate === "Excellent") overallScore += 25;
    else if (savingsRate === "Good") overallScore += 18;
    else if (savingsRate === "Fair") overallScore += 12;
    else overallScore += 5;
    
    // Retirement Score (20 points max)
    if (retirementReadiness === "On Track") overallScore += 20;
    else if (retirementReadiness === "Slightly Behind") overallScore += 15;
    else if (retirementReadiness === "Behind") overallScore += 8;
    else overallScore += 3;

    return {
      overallScore,
      debtRisk,
      emergencyFundStatus,
      retirementReadiness,
      savingsRate,
      debtToIncomeRatio,
      savingsRatePercent,
      monthsOfEmergencyFund,
      yearsToRetirement,
      retirementProgress,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.monthlyIncome === 0) {
      toast.error("Vă rugăm să introduceți venitul lunar!");
      return;
    }

    const calculatedMetrics = calculateMetrics(formData);
    setMetrics(calculatedMetrics);
    setShowResults(true);
    toast.success("Analiza sănătății financiare completă!");
  };

  const handleChange = (field: keyof FinancialData, value: string) => {
    setFormData({ ...formData, [field]: parseFloat(value) || 0 });
  };

  const getRecommendations = (): string[] => {
    if (!metrics) return [];
    
    const recommendations: string[] = [];

    // Debt recommendations
    if (metrics.debtRisk === "Critical" || metrics.debtRisk === "High") {
      recommendations.push("🚨 URGENT: Reduceți datoriile cu dobândă mare - prioritizați plata acestora");
      recommendations.push("Considerați consolidarea datoriilor pentru rate mai mici");
    } else if (metrics.debtRisk === "Moderate") {
      recommendations.push("Reduceți plățile lunare pentru datorii sub 20% din venit");
    }

    // Emergency Fund recommendations
    if (metrics.emergencyFundStatus === "Critical") {
      recommendations.push("🚨 URGENT: Creați un fond de urgență - începeți cu 1000 RON");
    } else if (metrics.emergencyFundStatus === "Needs Improvement") {
      recommendations.push("Construiți fondul de urgență la 3-6 luni de cheltuieli");
    } else if (metrics.emergencyFundStatus === "Good") {
      recommendations.push("Extindeți fondul de urgență la 6 luni de cheltuieli pentru siguranță maximă");
    }

    // Savings recommendations
    if (metrics.savingsRate === "Poor") {
      recommendations.push("Creșteți rata de economisire la minim 10% din venit");
      recommendations.push("Automatizați economiile - transferați automat la primirea salariului");
    } else if (metrics.savingsRate === "Fair") {
      recommendations.push("Încercați să creșteți economiile cu încă 5% din venit");
    } else if (metrics.savingsRate === "Good") {
      recommendations.push("Excelent! Considerați creșterea economiilor la 20%+ pentru independență financiară mai rapidă");
    }

    // Retirement recommendations
    if (metrics.retirementReadiness === "Critical" || metrics.retirementReadiness === "Behind") {
      recommendations.push("⚠️ Creșteți contribuțiile lunare pentru pensie urgent");
      recommendations.push("Considerați amânarea vârstei de pensionare cu 2-5 ani");
    } else if (metrics.retirementReadiness === "Slightly Behind") {
      recommendations.push("Creșteți contribuțiile pentru pensie cu 2-3%");
    }

    // General recommendations
    if (formData.monthlyExpenses / formData.monthlyIncome > 0.7) {
      recommendations.push("Cheltuielile sunt peste 70% din venit - identificați zone de reducere");
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ Felicitări! Sănătatea dvs. financiară este excelentă!");
      recommendations.push("Continuați obiceiurile bune și monitorizați regulat progresul");
    }

    return recommendations;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Low":
      case "Excellent":
      case "On Track":
        return "text-green-600 bg-green-50 border-green-200";
      case "Good":
      case "Moderate":
      case "Slightly Behind":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "Fair":
      case "Needs Improvement":
      case "Behind":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "Poor":
      case "High":
      case "Critical":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Low":
      case "Excellent":
      case "On Track":
        return <CheckCircle2 size={20} />;
      case "Good":
      case "Moderate":
      case "Slightly Behind":
        return <AlertCircle size={20} />;
      case "Fair":
      case "Needs Improvement":
      case "Behind":
        return <AlertTriangle size={20} />;
      case "Poor":
      case "High":
      case "Critical":
        return <AlertTriangle size={20} />;
      default:
        return <AlertCircle size={20} />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Sparkles className="text-blue-600 dark:text-blue-400" />
            Analizor Sănătate Financiară
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Evaluează-ți situația financiară și primește recomandări personalizate
          </p>
        </div>
      </div>

      {!showResults ? (
        <Card className="dark:bg-[#1a1a1a] dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-white">Introduceți Datele Financiare</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Income & Expenses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="monthlyIncome" className="flex items-center gap-2 dark:text-gray-300">
                    <DollarSign size={16} className="text-green-600 dark:text-green-400" />
                    Venit Lunar Net (RON) *
                  </Label>
                  <Input
                    id="monthlyIncome"
                    type="number"
                    required
                    value={formData.monthlyIncome || ""}
                    onChange={(e) => handleChange("monthlyIncome", e.target.value)}
                    placeholder="5000"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="monthlyExpenses" className="flex items-center gap-2 dark:text-gray-300">
                    <CreditCard size={16} className="text-red-600 dark:text-red-400" />
                    Cheltuieli Lunare (RON) *
                  </Label>
                  <Input
                    id="monthlyExpenses"
                    type="number"
                    required
                    value={formData.monthlyExpenses || ""}
                    onChange={(e) => handleChange("monthlyExpenses", e.target.value)}
                    placeholder="3500"
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="monthlySavings" className="flex items-center gap-2 dark:text-gray-300">
                    <PiggyBank size={16} className="text-blue-600 dark:text-blue-400" />
                    Economii Lunare (RON) *
                  </Label>
                  <Input
                    id="monthlySavings"
                    type="number"
                    required
                    value={formData.monthlySavings || ""}
                    onChange={(e) => handleChange("monthlySavings", e.target.value)}
                    placeholder="1000"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="emergencyFund" className="flex items-center gap-2 dark:text-gray-300">
                    <Target size={16} className="text-purple-600 dark:text-purple-400" />
                    Fond de Urgență (RON)
                  </Label>
                  <Input
                    id="emergencyFund"
                    type="number"
                    value={formData.emergencyFund || ""}
                    onChange={(e) => handleChange("emergencyFund", e.target.value)}
                    placeholder="15000"
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Debts */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Datorii</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="totalDebts" className="dark:text-gray-300">Total Datorii (RON)</Label>
                    <Input
                      id="totalDebts"
                      type="number"
                      value={formData.totalDebts || ""}
                      onChange={(e) => handleChange("totalDebts", e.target.value)}
                      placeholder="50000"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="monthlyDebtPayment" className="dark:text-gray-300">Plată Lunară Datorii (RON)</Label>
                    <Input
                      id="monthlyDebtPayment"
                      type="number"
                      value={formData.monthlyDebtPayment || ""}
                      onChange={(e) => handleChange("monthlyDebtPayment", e.target.value)}
                      placeholder="1500"
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              {/* Investments & Retirement */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Investiții și Pensie</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="investments" className="dark:text-gray-300">Investiții Totale (RON)</Label>
                    <Input
                      id="investments"
                      type="number"
                      value={formData.investments || ""}
                      onChange={(e) => handleChange("investments", e.target.value)}
                      placeholder="25000"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="retirementGoal" className="dark:text-gray-300">Obiectiv Pensie (RON)</Label>
                    <Input
                      id="retirementGoal"
                      type="number"
                      value={formData.retirementGoal || ""}
                      onChange={(e) => handleChange("retirementGoal", e.target.value)}
                      placeholder="500000"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <Label htmlFor="age" className="dark:text-gray-300">Vârsta Actuală</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age || ""}
                      onChange={(e) => handleChange("age", e.target.value)}
                      placeholder="30"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="retirementAge" className="dark:text-gray-300">Vârsta de Pensionare</Label>
                    <Input
                      id="retirementAge"
                      type="number"
                      value={formData.retirementAge || ""}
                      onChange={(e) => handleChange("retirementAge", e.target.value)}
                      placeholder="65"
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button type="submit" size="lg" className="px-8">
                  <Sparkles className="mr-2" size={20} />
                  Analizează Sănătatea Financiară
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overall Score */}
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-[#1a1a1a]">
            <CardContent className="p-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Scor Sănătate Financiară
                </h2>
                <div className={`text-7xl font-bold mb-4 ${getScoreColor(metrics!.overallScore)}`}>
                  {metrics!.overallScore}
                  <span className="text-3xl">/100</span>
                </div>
                <Progress value={metrics!.overallScore} className="h-4 mb-4" />
                <p className="text-gray-600 dark:text-gray-300">
                  {metrics!.overallScore >= 80 && "Excelent! Sănătate financiară foarte bună."}
                  {metrics!.overallScore >= 60 &&
                    metrics!.overallScore < 80 &&
                    "Bun! Cu îmbunătățiri minore poți ajunge la excelent."}
                  {metrics!.overallScore >= 40 &&
                    metrics!.overallScore < 60 &&
                    "Satisfăcător. Sunt zone care necesită atenție."}
                  {metrics!.overallScore < 40 &&
                    "Necesită îmbunătățiri urgente. Contactează-mă pentru consultanță."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowResults(false)}
                  className="mt-4"
                >
                  Recalculează
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="dark:bg-[#1a1a1a] dark:border-gray-800">
              <CardContent className="p-6">
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(
                    metrics!.debtRisk
                  )} dark:bg-opacity-20`}
                >
                  <div>
                    <p className="text-sm font-medium mb-1">Risc Datorii</p>
                    <p className="text-lg font-bold">{metrics!.debtRisk}</p>
                    <p className="text-xs mt-1">
                      {metrics!.debtToIncomeRatio.toFixed(1)}% din venit
                    </p>
                  </div>
                  {getStatusIcon(metrics!.debtRisk)}
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-[#1a1a1a] dark:border-gray-800">
              <CardContent className="p-6">
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(
                    metrics!.emergencyFundStatus
                  )} dark:bg-opacity-20`}
                >
                  <div>
                    <p className="text-sm font-medium mb-1">Fond Urgență</p>
                    <p className="text-lg font-bold">{metrics!.emergencyFundStatus}</p>
                    <p className="text-xs mt-1">
                      {metrics!.monthsOfEmergencyFund.toFixed(1)} luni
                    </p>
                  </div>
                  {getStatusIcon(metrics!.emergencyFundStatus)}
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-[#1a1a1a] dark:border-gray-800">
              <CardContent className="p-6">
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(
                    metrics!.retirementReadiness
                  )} dark:bg-opacity-20`}
                >
                  <div>
                    <p className="text-sm font-medium mb-1">Pregătire Pensie</p>
                    <p className="text-lg font-bold">{metrics!.retirementReadiness}</p>
                    <p className="text-xs mt-1">
                      {metrics!.retirementProgress.toFixed(0)}% din obiectiv
                    </p>
                  </div>
                  {getStatusIcon(metrics!.retirementReadiness)}
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-[#1a1a1a] dark:border-gray-800">
              <CardContent className="p-6">
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(
                    metrics!.savingsRate
                  )} dark:bg-opacity-20`}
                >
                  <div>
                    <p className="text-sm font-medium mb-1">Rată Economisire</p>
                    <p className="text-lg font-bold">{metrics!.savingsRate}</p>
                    <p className="text-xs mt-1">
                      {metrics!.savingsRatePercent.toFixed(1)}% din venit
                    </p>
                  </div>
                  {getStatusIcon(metrics!.savingsRate)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Distribution */}
            <Card className="dark:bg-[#1a1a1a] dark:border-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Distribuție Venit Lunar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Cheltuieli", value: formData.monthlyExpenses },
                        { name: "Economii", value: formData.monthlySavings },
                        { name: "Datorii", value: formData.monthlyDebtPayment },
                        {
                          name: "Altele",
                          value: Math.max(
                            0,
                            formData.monthlyIncome -
                              formData.monthlyExpenses -
                              formData.monthlySavings -
                              formData.monthlyDebtPayment
                          ),
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#ef4444" />
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#6b7280" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Financial Overview */}
            <Card className="dark:bg-[#1a1a1a] dark:border-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Situație Financiară Generală</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        name: "Venit",
                        value: formData.monthlyIncome,
                      },
                      {
                        name: "Cheltuieli",
                        value: formData.monthlyExpenses,
                      },
                      {
                        name: "Economii",
                        value: formData.monthlySavings,
                      },
                      {
                        name: "Fond Urgență",
                        value: formData.emergencyFund / 10,
                      },
                    ]}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  * Fond urgență împărțit la 10 pentru vizualizare
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card className="border-2 border-purple-200 dark:border-purple-800 dark:bg-[#1a1a1a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Sparkles className="text-purple-600 dark:text-purple-400" />
                Recomandări Personalizate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getRecommendations().map((recommendation, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
                  >
                    <div className="w-6 h-6 bg-purple-600 dark:bg-purple-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 flex-1">{recommendation}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-200 mb-2">
                  <strong>Vrei să discutăm planul tău personalizat?</strong>
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
                  Programează o consultanță gratuită pentru a primi ghidare detaliată și un plan
                  de acțiune concret.
                </p>
                <Button asChild>
                  <a href="/cont/programari">Programează Consultanță Gratuită</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}