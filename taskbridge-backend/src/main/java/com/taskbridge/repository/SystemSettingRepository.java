package com.taskbridge.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.taskbridge.entity.SystemSetting;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {
}
