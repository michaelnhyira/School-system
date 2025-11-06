import React, { useState } from 'react';
import { useAcademicPeriod } from '../contexts/AcademicPeriodContext';
import { Calendar, Check, Loader2, X } from 'lucide-react';

const AcademicPeriodSelector: React.FC = () => {
  const { currentPeriod, allPeriods, loading, error, setCurrentPeriod } = useAcademicPeriod();
  const [isChanging, setIsChanging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePeriodChange = async (academicYear: string, term: string) => {
    if (currentPeriod?.academicYear === academicYear && currentPeriod?.term === term) {
      setIsModalOpen(false);
      return; // Already selected
    }

    setIsChanging(true);
    try {
      await setCurrentPeriod(academicYear, term);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error changing academic period:', error);
    } finally {
      setIsChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Error: {error}
      </div>
    );
  }

  if (allPeriods.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        No periods found
      </div>
    );
  }

  return (
    <>
      {/* Period Selector Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={isChanging}
        className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 disabled:opacity-50"
      >
        <Calendar className="h-4 w-4" />
        <div className="text-left">
          <div className="text-xs text-blue-600 font-medium">Select Period</div>
          <div className="text-sm font-semibold">
            {currentPeriod ? 'Change' : 'Choose'}
          </div>
        </div>
        {isChanging && <Loader2 className="h-4 w-4 animate-spin" />}
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Select Academic Period</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {allPeriods.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Academic Periods</h3>
                  <p className="text-gray-500">Set up fees to create academic periods.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allPeriods.map((period) => {
                    const isActive = currentPeriod?.academicYear === period.academicYear && 
                                   currentPeriod?.term === period.term;
                    
                    return (
                      <button
                        key={`${period.academicYear}_${period.term}`}
                        onClick={() => handlePeriodChange(period.academicYear, period.term)}
                        disabled={isChanging}
                        className={`w-full flex items-center justify-between p-4 rounded-lg border text-left transition-all ${
                          isActive
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        } ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div>
                          <div className="font-medium text-lg">
                            {period.academicYear} - {period.term}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {period.isActive ? 'Currently Active' : 'Available'}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isChanging && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          )}
                          {isActive && !isChanging && (
                            <Check className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AcademicPeriodSelector;
