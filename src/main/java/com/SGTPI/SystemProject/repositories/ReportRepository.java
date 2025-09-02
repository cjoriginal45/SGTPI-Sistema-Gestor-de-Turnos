package com.SGTPI.SystemProject.repositories;

import com.SGTPI.SystemProject.models.Report;
import org.springframework.data.jpa.repository.JpaRepository;
//Repository de Reportes
public interface ReportRepository extends JpaRepository<Report,Integer> {
}
